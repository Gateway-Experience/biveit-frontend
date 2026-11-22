import { useState } from 'react';
import _ from 'lodash';
import { useQuery } from '@tanstack/react-query';
import { ArrowDownIcon, ArrowUpIcon } from 'lucide-react';

import { Badge } from 'src/components/shadui/badge';
import { Button } from 'src/components/shadui/button';
import { Card, CardContent, CardHeader, CardTitle } from 'src/components/shadui/card';
import { Checkbox } from 'src/components/shadui/checkbox';
import { ADMIN_QUERY_KEY, getUsers } from 'src/services/admin';
import type { AdminUser } from 'src/types/admin';

// Intentions: every user on the platform (/admin/users) -- who they are, when they were last active, how many
// projects they have and what their agents have cost so far. The BE hands back the whole list; sorting (newest
// signup first by default, any column by clicking its header) and hiding guests happen here. Guests are hidden by
// default: every visitor gets a guest account, so they'd drown out the real ones. English only, like all of /admin.

type SortKey = 'id' | 'name' | 'email' | 'user_type' | 'is_admin' | 'project_count' | 'cost_usd' | 'created_at' | 'last_active_at';

const _COLUMNS: { key: SortKey; label: string; isNumeric?: boolean }[] = [
  { key: 'id', label: 'ID', isNumeric: true },
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'user_type', label: 'Type' },
  { key: 'is_admin', label: 'Admin' },
  { key: 'project_count', label: 'Projects', isNumeric: true },
  { key: 'cost_usd', label: 'AI cost', isNumeric: true },
  { key: 'created_at', label: 'Signed up' },
  { key: 'last_active_at', label: 'Last active' },
];

const _formatDate = (at: string) => new Date(at).toLocaleString();

export default function AdminUsers() {
  const [sort, setSort] = useState<{ key: SortKey; isDescending: boolean }>({ key: 'created_at', isDescending: true });
  const [isShowingGuests, setIsShowingGuests] = useState(false);
  const { data: users, isFetching, isError, refetch } = useQuery({
    queryKey: [ADMIN_QUERY_KEY, 'users'],
    queryFn: getUsers,
    staleTime: 0,
  });

  const shownUsers = isShowingGuests ? users : _.reject(users, { user_type: 'GUEST' });
  // Missing values (no name, no email) always sink to the bottom, whichever way the column is sorted.
  const [withValue, withoutValue] = _.partition(shownUsers, user => !_.isNil(user[sort.key]));
  const sortedUsers = [..._.orderBy(withValue, [sort.key], [sort.isDescending ? 'desc' : 'asc']), ...withoutValue];
  // A new column starts descending (biggest, newest first) -- the useful end for most of them.
  const sortBy = (key: SortKey) => setSort(current => ({ key, isDescending: current.key === key ? !current.isDescending : true }));

  return (
    <div className='flex flex-col gap-6' data-page='admin-users'>
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <h1 className='text-2xl font-semibold'>Users</h1>
        <div className='flex items-center gap-4'>
          <label className='flex items-center gap-2 text-sm'>
            <Checkbox checked={isShowingGuests} onCheckedChange={checked => setIsShowingGuests(!!checked)} data-input='show-guests' />
            Show guests
          </label>
          <Button variant='outline' size='sm' onClick={() => refetch()} disabled={isFetching} data-action='refresh'>
            {isFetching ? 'Refreshing…' : 'Refresh'}
          </Button>
        </div>
      </div>

      {isError && <p className='text-sm text-destructive'>Couldn’t read the users.</p>}

      <Card size='sm' data-section='users'>
        <CardHeader>
          <CardTitle>
            {_.size(shownUsers)} users
            {!isShowingGuests && users && <span className='ml-2 font-normal text-muted-foreground'>({_.size(users) - _.size(shownUsers)} guests hidden)</span>}
          </CardTitle>
        </CardHeader>
        <CardContent className='overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead className='text-left text-muted-foreground'>
              <tr className='border-b'>
                {_.map(_COLUMNS, column => (
                  <th key={column.key} className={`py-2 pr-4 font-medium ${column.isNumeric ? 'text-right' : ''}`}>
                    <button
                      type='button'
                      onClick={() => sortBy(column.key)}
                      className='inline-flex items-center gap-1 whitespace-nowrap hover:text-foreground'
                      data-sort={column.key}
                    >
                      {column.label}
                      {sort.key === column.key && (sort.isDescending ? <ArrowDownIcon className='size-3' /> : <ArrowUpIcon className='size-3' />)}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {_.map(sortedUsers, (user: AdminUser) => (
                <tr key={user.id} className='border-b last:border-0 hover:bg-muted/50' data-userid={user.id}>
                  <td className='py-2 pr-4 text-right font-mono'>{user.id}</td>
                  <td className='py-2 pr-4'>{user.name ?? <span className='text-muted-foreground'>--</span>}</td>
                  <td className='py-2 pr-4'>{user.email ?? <span className='text-muted-foreground'>--</span>}</td>
                  <td className='py-2 pr-4'>
                    <Badge variant={user.user_type === 'GUEST' ? 'outline' : 'secondary'}>{user.user_type.toLowerCase()}</Badge>
                  </td>
                  <td className='py-2 pr-4'>{user.is_admin && <Badge>admin</Badge>}</td>
                  <td className='py-2 pr-4 text-right font-mono'>{user.project_count}</td>
                  <td className='py-2 pr-4 text-right font-mono'>${user.cost_usd.toFixed(2)}</td>
                  <td className='py-2 pr-4 whitespace-nowrap text-muted-foreground'>{_formatDate(user.created_at)}</td>
                  <td className='py-2 whitespace-nowrap text-muted-foreground'>{_formatDate(user.last_active_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
