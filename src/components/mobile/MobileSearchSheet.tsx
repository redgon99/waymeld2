import { MobileSheet } from './MobileSheet';
import { SearchPanel } from '../SearchPanel';
import type { ComponentProps } from 'react';

type SearchPanelProps = ComponentProps<typeof SearchPanel>;

interface Props extends SearchPanelProps {
  open: boolean;
  onClose: () => void;
}

export function MobileSearchSheet({ open, onClose, ...searchProps }: Props) {
  return (
    <MobileSheet open={open} onClose={onClose} title="검색" height="tall">
      <SearchPanel {...searchProps} variant="compact" />
    </MobileSheet>
  );
}
