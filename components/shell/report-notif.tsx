'use client';

import { IconBellFilled } from '@tabler/icons-react';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import { useSidebar } from '@/components/ui/sidebar';
import { useReports } from '@/components/context/report-provider';

export default function NotificationBell() {
  const { notifications, unreadCount, handleOpenNotifications } = useReports();
  // In the phone drawer there is no room beside the bell, so open upwards.
  const { isMobile } = useSidebar();

  return (
    <Popover onOpenChange={(open) => open && handleOpenNotifications()}>
      <PopoverTrigger
        aria-label="Notifications"
        className="relative rounded-full p-2 transition hover:bg-gray-100"
      >
        <IconBellFilled className="h-4.5 w-4.5 cursor-pointer text-[#b2adab]" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-1 -right-1 rounded-full bg-red-500 px-1.5 text-xs text-white">
            {unreadCount}
          </Badge>
        )}
      </PopoverTrigger>

      <PopoverContent
        className="w-72 max-w-[calc(100vw-1rem)] p-4"
        side={isMobile ? 'top' : 'right'}
        align="end"
        collisionPadding={8}
      >
        <h4 className="mb-3 text-sm font-semibold">Notifications</h4>

        {notifications.length === 0 ? (
          <p className="text-sm text-gray-500">No new notifications.</p>
        ) : (
          <ul className="max-h-60 space-y-2 overflow-auto">
            {notifications.slice(0, 5).map((n) => (
              <li
                key={n.id}
                className="flex flex-col gap-1 rounded-lg border p-3 transition hover:bg-gray-50"
              >
                <p className="text-sm text-gray-800">
                  <span className="w-full">
                    <span className="font-medium">
                      {n.status === 'pending'
                        ? 'New Report Added'
                        : `Report Updated`}
                    </span>
                    <span className="text-xs font-normal"> ({n.status})</span>
                  </span>
                </p>
                <span className="mb-2 text-xs font-normal">
                  {n.category || 'report'} from {n.reporterName || 'Unknown'}
                </span>

                <p className="text-sm text-gray-600">
                  {n.address || 'No address provided'}
                </p>

                {/* {n.description && ( 
                  <p className="text-xs text-gray-500 italic">
                    “
                    {n.description.length > 60
                      ? n.description.slice(0, 60) + "..."
                      : n.description}
                    ”
                  </p>
                )} */}

                <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
                  <span>{new Date(n.date).toLocaleString()}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
