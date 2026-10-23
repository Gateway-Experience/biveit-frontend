import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { cn } from 'cn';

import { Button } from 'src/components/shadui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from 'src/components/shadui/card';
import { ADMIN_QUERY_KEY, getServerUsage } from 'src/services/admin';

// Intentions: the machine's CPU, memory and disk at a glance, refreshed every 2s while "live" (pause it to
// stop polling). CPU is measured between two reads, so the very first one after the backend starts says 0%.

const _REFRESH_MS = 2000;

// [Pure]
function formatBytes(bytes: number) {
  const gigabytes = bytes / 1024 ** 3;
  return gigabytes >= 1 ? `${gigabytes.toFixed(1)} GB` : `${(bytes / 1024 ** 2).toFixed(0)} MB`;
}

// [Pure]
function formatUptime(seconds: number) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  return days ? `${days}d ${hours}h` : `${hours}h ${Math.floor((seconds % 3600) / 60)}m`;
}

function UsageMeter({ name, percent, detail }: { name: string; percent: number; detail: string }) {
  return (
    <div className='flex flex-col gap-1.5' data-meter={name.toLowerCase()}>
      <div className='flex items-baseline justify-between gap-2 text-sm'>
        <span className='font-medium'>{name}</span>
        <span className='font-mono text-xs text-muted-foreground'>{detail}</span>
      </div>
      <div className='h-2 overflow-hidden rounded-full bg-muted'>
        <div
          className={cn('h-full rounded-full transition-[width] duration-500', percent >= 90 ? 'bg-destructive' : percent >= 75 ? 'bg-amber-500' : 'bg-primary')}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
      <span className='font-mono text-lg font-semibold tabular-nums'>{percent.toFixed(1)}%</span>
    </div>
  );
}

export default function ServerUsage() {
  const [isLive, setIsLive] = useState(true);
  const { data: usage, isError } = useQuery({
    queryKey: [ADMIN_QUERY_KEY, 'server-usage'],
    queryFn: getServerUsage,
    refetchInterval: isLive ? _REFRESH_MS : false,
    staleTime: 0,
  });

  return (
    <Card size='sm' data-section='server-usage'>
      <CardHeader>
        <CardTitle>Server</CardTitle>
        <CardAction>
          <Button variant={isLive ? 'secondary' : 'outline'} size='sm' onClick={() => setIsLive(!isLive)} data-live={isLive}>
            {isLive ? 'Live · pause' : 'Paused · resume'}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {isError && <p className='text-sm text-destructive'>Couldn’t read the server’s usage.</p>}
        {usage && (
          <div className='grid gap-6 sm:grid-cols-3'>
            <UsageMeter
              name='CPU'
              percent={usage.cpu.percent}
              detail={`${usage.cpu.count} cores · load ${usage.cpu.load.map(load => load.toFixed(2)).join(' ')}`}
            />
            <UsageMeter
              name='Memory'
              percent={usage.memory.percent}
              detail={`${formatBytes(usage.memory.used)} / ${formatBytes(usage.memory.total)}`}
            />
            <UsageMeter
              name='Disk'
              percent={usage.disk.percent}
              detail={`${formatBytes(usage.disk.used)} / ${formatBytes(usage.disk.total)}`}
            />
          </div>
        )}
        {usage && <p className='mt-4 text-xs text-muted-foreground'>Up {formatUptime(usage.uptime_seconds)}</p>}
      </CardContent>
    </Card>
  );
}
