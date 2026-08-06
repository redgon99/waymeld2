import type { ReactNode } from 'react';

/** Minimal markdown for guide bodies (headings, lists, paragraphs, bold/italic, links). */
export function renderGuideMarkdown(md: string): ReactNode[] {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const nodes: ReactNode[] = [];
  let listItems: string[] = [];
  let listOrdered = false;
  let key = 0;

  const flushList = () => {
    if (listItems.length === 0) return;
    const Tag = listOrdered ? 'ol' : 'ul';
    nodes.push(
      <Tag key={`list-${key++}`}>
        {listItems.map((item, i) => (
          <li key={i}>{inline(item)}</li>
        ))}
      </Tag>
    );
    listItems = [];
  };

  const inline = (text: string): ReactNode => {
    const parts: ReactNode[] = [];
    const re = /(\*\*[^*]+\*\*|\*[^*]+\*|\[([^\]]+)\]\(([^)]+)\))/g;
    let last = 0;
    let m: RegExpExecArray | null;
    let i = 0;
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) parts.push(text.slice(last, m.index));
      const token = m[0];
      if (token.startsWith('**')) {
        parts.push(<strong key={`b-${i++}`}>{token.slice(2, -2)}</strong>);
      } else if (token.startsWith('*')) {
        parts.push(<em key={`e-${i++}`}>{token.slice(1, -1)}</em>);
      } else if (m[2] && m[3]) {
        parts.push(
          <a key={`a-${i++}`} href={m[3]} target="_blank" rel="noopener noreferrer">
            {m[2]}
          </a>
        );
      }
      last = m.index + token.length;
    }
    if (last < text.length) parts.push(text.slice(last));
    return parts.length === 1 ? parts[0] : <>{parts}</>;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      continue;
    }
    const ol = trimmed.match(/^\d+\.\s+(.*)$/);
    const ul = trimmed.match(/^[-*]\s+(.*)$/);
    if (ol) {
      if (listItems.length > 0 && !listOrdered) flushList();
      listOrdered = true;
      listItems.push(ol[1]);
      continue;
    }
    if (ul) {
      if (listItems.length > 0 && listOrdered) flushList();
      listOrdered = false;
      listItems.push(ul[1]);
      continue;
    }
    flushList();
    if (trimmed.startsWith('### ')) {
      nodes.push(<h3 key={`h3-${key++}`}>{inline(trimmed.slice(4))}</h3>);
    } else if (trimmed.startsWith('## ')) {
      nodes.push(<h2 key={`h2-${key++}`}>{inline(trimmed.slice(3))}</h2>);
    } else if (trimmed.startsWith('# ')) {
      nodes.push(<h1 key={`h1-${key++}`}>{inline(trimmed.slice(2))}</h1>);
    } else {
      nodes.push(<p key={`p-${key++}`}>{inline(trimmed)}</p>);
    }
  }
  flushList();
  return nodes;
}
