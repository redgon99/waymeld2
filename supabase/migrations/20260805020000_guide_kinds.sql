-- guide_articles.kind 세분화 (7종)

alter table public.guide_articles
  add column if not exists kind text not null default 'practical';

alter table public.guide_articles
  drop constraint if exists guide_articles_kind_check;

alter table public.guide_articles
  add constraint guide_articles_kind_check
  check (
    kind in (
      'course',
      'practical',
      'prepare',
      'food',
      'culture',
      'shopping',
      'safety'
    )
  );

create index if not exists guide_articles_kind_status_idx
  on public.guide_articles (kind, status, published_at desc nulls last);
