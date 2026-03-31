"use client";

import React, {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from "react";
import { TrendingUp, RefreshCcw } from "lucide-react";
import { HoldingPnL } from "@/types/trade";
import { apiClient } from "@/lib/apiClient";

// ─────────────────────────────────────────
// ユーティリティ
// ─────────────────────────────────────────

function buildInitialPrices(holdings: HoldingPnL[]): Record<string, number> {
  return Object.fromEntries(holdings.map((h) => [h.coin_id, h.current_price]));
}

function applyPercentToAll(
  prices: Record<string, number>,
  percent: number,
): Record<string, number> {
  return Object.fromEntries(
    Object.entries(prices).map(([id, price]) => [
      id,
      price * (1 + percent / 100),
    ]),
  );
}

// ─────────────────────────────────────────
// カスタムフック：シミュレーションロジック
// ─────────────────────────────────────────

function usePnLSimulator(initialHoldings: HoldingPnL[]) {
  const [simulationHoldings, setSimulationHoldings] =
    useState<HoldingPnL[]>(initialHoldings);
  const [prices, setPrices] = useState<Record<string, number>>(() =>
    buildInitialPrices(initialHoldings),
  );
  const [isCalculating, setIsCalculating] = useState(false);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSimulation = useCallback(
    async (updatedPrices: Record<string, number>) => {
      setIsCalculating(true);
      try {
        const data = await apiClient.postTargetPnL({ prices: updatedPrices });
        setSimulationHoldings(data);
      } catch (error) {
        console.error("シミュレーション計算に失敗:", error);
      } finally {
        setIsCalculating(false);
      }
    },
    [],
  );

  const debouncedFetch = useCallback(
    (updatedPrices: Record<string, number>) => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(
        () => fetchSimulation(updatedPrices),
        500,
      );
    },
    [fetchSimulation],
  );

  const handlePriceChange = useCallback(
    (coinId: string, newPrice: number) => {
      const updatedPrices = { ...prices, [coinId]: newPrice };
      setPrices(updatedPrices);
      debouncedFetch(updatedPrices);
    },
    [prices, debouncedFetch],
  );

  const handleApplyPercent = useCallback(
    (percent: number) => {
      const updatedPrices = applyPercentToAll(prices, percent);
      setPrices(updatedPrices);
      fetchSimulation(updatedPrices);
    },
    [prices, fetchSimulation],
  );

  const handleReset = useCallback(() => {
    const resetPrices = buildInitialPrices(initialHoldings);
    setPrices(resetPrices);
    fetchSimulation(resetPrices);
  }, [initialHoldings, fetchSimulation]);

  const totals = useMemo(
    () => ({
      pnl: simulationHoldings.reduce((sum, h) => sum + h.pnl, 0),
      value: simulationHoldings.reduce(
        (sum, h) => sum + h.current_price * h.amount,
        0,
      ),
    }),
    [simulationHoldings],
  );

  return {
    simulationHoldings,
    prices,
    isCalculating,
    totals,
    handlePriceChange,
    handleApplyPercent,
    handleReset,
  };
}

// ─────────────────────────────────────────
// コンポーネント
// ─────────────────────────────────────────

export const PnLSimulator = ({
  initialHoldings,
  onSimulationChange,
}: {
  initialHoldings: HoldingPnL[];
  onSimulationChange?: (pnl: number) => void;
}) => {
  const {
    simulationHoldings,
    prices,
    isCalculating,
    totals,
    handlePriceChange,
    handleApplyPercent,
    handleReset,
  } = usePnLSimulator(initialHoldings);

  // フロントで即時計算（APIを待たずにシミュレーション結果を返す）
  const localSimulatedPnL = useMemo(() => {
    return initialHoldings.reduce((sum, h) => {
      const price = prices[h.coin_id] ?? h.current_price;
      return sum + (price - h.avg_price) * h.amount;
    }, 0);
  }, [initialHoldings, prices]);

  // 計算結果が更新されたら親へ通知
  useEffect(() => {
    onSimulationChange?.(localSimulatedPnL);
  }, [localSimulatedPnL, onSimulationChange]);

  return (
    <div className="bg-white p-6 rounded-2xl text-gray-900 shadow-sm border border-gray-100">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="text-indigo-600" />
            目標損益シミュレーター
          </h2>
          <p className="text-gray-500 text-sm">
            目標価格を入力して、ポートフォリオの将来を予測します
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleApplyPercent(10)}
            className="px-3 py-1 bg-green-900/30 text-green-400 border border-green-800 rounded-md text-sm hover:bg-green-900/50"
          >
            全体 +10%
          </button>
          <button
            onClick={handleReset}
            className="p-2 bg-gray-50 text-gray-400 border border-gray-200 rounded-md hover:bg-gray-100 hover:text-gray-600 transition-colors"
            title="リセット"
          >
            <RefreshCcw size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
          <p className="text-gray-400 text-xs uppercase font-bold tracking-wider">
            推定総資産額
          </p>
          <p className="text-3xl font-black mt-1">
            ¥{totals.value.toLocaleString()}
          </p>
        </div>
        <div
          className={`p-4 rounded-lg border ${
            totals.pnl >= 0
              ? "bg-emerald-50 border-emerald-100"
              : "bg-rose-50 border-rose-100"
          }`}
        >
          <p className="text-gray-400 text-xs uppercase font-bold tracking-wider">
            シミュレーション損益
          </p>
          <p
            className={`text-3xl font-black mt-1 ${
              totals.pnl >= 0 ? "text-emerald-600" : "text-rose-500"
            }`}
          >
            {totals.pnl >= 0 ? "+" : ""}¥{totals.pnl.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="text-gray-500 text-xs uppercase border-b border-gray-100">
            <tr>
              <th className="pb-3 px-2">銘柄</th>
              <th className="pb-3 px-2 text-right">保有量</th>
              <th className="pb-3 px-2 text-right">取得単価</th>
              <th className="pb-3 px-2 text-center w-44">目標価格 (JPY)</th>
              <th className="pb-3 px-2 text-right">見込損益</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {simulationHoldings.map((holding) => (
              <SimulatorRow
                key={holding.coin_id}
                holding={holding}
                inputPrice={prices[holding.coin_id] ?? 0}
                onPriceChange={handlePriceChange}
              />
            ))}
          </tbody>
        </table>
      </div>

      {isCalculating && (
        <div className="mt-4 flex items-center justify-center text-indigo-600 text-sm gap-2 font-bold italic">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600" />
          AIが再計算中...
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────
// 行コンポーネント（再レンダリング範囲を限定）
// ─────────────────────────────────────────

type SimulatorRowProps = {
  holding: HoldingPnL;
  inputPrice: number;
  onPriceChange: (coinId: string, newPrice: number) => void;
};

const SimulatorRow = React.memo(
  ({ holding, inputPrice, onPriceChange }: SimulatorRowProps) => {
    const isProfitable = holding.pnl >= 0;

    return (
      <tr className="hover:bg-gray-50 transition-colors">
        <td className="py-4 px-2 font-medium">{holding.coin_name}</td>
        <td className="py-4 px-2 text-right font-mono text-gray-900">
          {holding.amount}
        </td>
        <td className="py-4 px-2 text-right font-mono text-gray-500 text-xs">
          ¥{holding.avg_price.toLocaleString()}
        </td>
        <td className="py-4 px-2 text-center">
          <div className="relative group">
            <input
              type="number"
              value={inputPrice}
              onChange={(e) =>
                onPriceChange(holding.coin_id, Number(e.target.value))
              }
              className="w-full bg-white border border-gray-200 rounded-lg px-2 py-2 text-right font-mono focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
            />
            <div className="hidden group-hover:block absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-10">
              現在: ¥{holding.current_price.toLocaleString()}
            </div>
          </div>
        </td>
        <td className="py-4 px-2 text-right">
          <div
            className={`font-bold ${isProfitable ? "text-green-400" : "text-red-400"}`}
          >
            ¥{Math.floor(holding.pnl).toLocaleString()}
          </div>
          <div
            className={`text-xs ${isProfitable ? "text-green-500/70" : "text-red-500/70"}`}
          >
            ({holding.pnl_percent.toFixed(2)}%)
          </div>
        </td>
      </tr>
    );
  },
);

SimulatorRow.displayName = "SimulatorRow";
