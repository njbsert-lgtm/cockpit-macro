import { LoadingState, SkeletonBlock, SkeletonLine, SkeletonRow } from "@/components/states/Skeleton";

export function BulletinSkeleton() {
  return (
    <LoadingState label="Chargement du bulletin">
      <div className="bg-deep px-4 py-8 md:px-6">
        <div className="mx-auto max-w-[1060px]">
          <SkeletonBlock className="h-3 w-40 bg-white/15" />
          <SkeletonBlock className="mt-3 h-9 w-3/4 bg-white/15" />
          <div className="mt-6 grid grid-cols-2 gap-1 md:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <SkeletonBlock key={i} className="h-14 bg-white/10" />
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1060px] px-4 py-8 md:px-6">
        <div className="border border-line bg-card p-4">
          <SkeletonLine width="30%" />
          <div className="mt-4 flex flex-col gap-3">
            <SkeletonLine width="95%" />
            <SkeletonLine width="88%" />
            <SkeletonLine width="70%" />
          </div>
        </div>

        <div className="mt-8">
          <SkeletonLine width="20%" />
          <div className="mt-3 flex flex-col gap-0">
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>
        </div>
      </div>
    </LoadingState>
  );
}
