"use client";

type Props = {
  targetPnL: number;
  currentPnL: number;
  onChange: (value: number) => void;
};

export const TargetPnLCard = ({ targetPnL, currentPnL, onChange }: Props) => {
  const progress =
    // マイナス進捗を防ぐため下限を0にする
    targetPnL > 0
      ? Math.max(0, Math.min((currentPnL / targetPnL) * 100, 100))
      : 0;

  const remaining = targetPnL - currentPnL;

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={targetPnL}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full border px-3 py-2 rounded"
          />
          <span>円</span>
        </div>
      </div>

      <div>
        <p className="text-sm mb-1">進捗: {progress.toFixed(1)}%</p>

        <div className="w-full bg-gray-200 h-3 rounded">
          <div
            className="h-3 rounded bg-green-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="text-xs mt-2">
          あと {remaining > 0 ? remaining.toLocaleString() : 0} 円で達成
        </p>
      </div>
    </div>
  );
};
