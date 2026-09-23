import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Spinner } from '@/components/ui/spinner';

interface SpinnerEmptyProps {
  emptyTitle?: string;
  emptyDescription?: string;
  onCancel?: () => void;
}

export function SpinnerEmpty({
  emptyTitle = 'Processing your image',
  emptyDescription = 'Please wait while we locate your issue. Do not refresh the page.',
  onCancel,
}: SpinnerEmptyProps) {
  return (
    <Empty className="w-full">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Spinner />
        </EmptyMedia>
        <EmptyTitle>{emptyTitle}</EmptyTitle>
        <EmptyDescription>{emptyDescription}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button type="button" onClick={onCancel} variant="outline" size="sm">
          Cancel
        </Button>
      </EmptyContent>
    </Empty>
  );
}
