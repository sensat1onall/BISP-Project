import { cn } from '@/lib/utils';

export const Skeleton = ({ className }: { className?: string }) => (
    <div className={cn("animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700", className)} />
);

export const TripCardSkeleton = () => (
    <div className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-700">
        <Skeleton className="h-48 w-full rounded-none" />
        <div className="p-4 space-y-3">
            <div className="flex justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-700">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-8 w-20 rounded-lg" />
            </div>
        </div>
    </div>
);

export const ProfileSkeleton = () => (
    <div className="space-y-6 p-6">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <div className="flex items-end gap-4 -mt-12 ml-4">
            <Skeleton className="w-24 h-24 rounded-full" />
            <Skeleton className="h-6 w-40" />
        </div>
        <Skeleton className="h-32 w-full rounded-2xl" />
        <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
        </div>
    </div>
);
