import { Spinner } from 'src/components/common/Spinner';

type FullScreenLoadingProps = {
  loading?: boolean;
};

function FullScreenLoading({ loading = true }: FullScreenLoadingProps) {
  if (!loading) {
    return null;
  }

  return (
    <div
      className='fixed inset-0 z-[2147483647] flex flex-col items-center justify-center gap-4 bg-scrim text-scrim-foreground'
      role='presentation'
    >
      <Spinner className='size-[70px] text-brand-strong' />
    </div>
  );
}

export default FullScreenLoading;
