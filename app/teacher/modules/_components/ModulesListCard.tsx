import Card from "@/components/Card";
import type { ModuleItem } from "../types";

type ModulesListCardProps = {
  modules: ModuleItem[];
  moving: boolean;
  onSwapOrder: (index: number, direction: "up" | "down") => void | Promise<void>;
};

export default function ModulesListCard({ modules, moving, onSwapOrder }: ModulesListCardProps) {
  return (
    <Card title="模块列表" tag="结构">
      {modules.length ? (
        <div className="grid" style={{ gap: 10 }}>
          {modules.map((item, index) => (
            <div className="card" key={item.id}>
              <div className="section-title">{item.title}</div>
              <div style={{ fontSize: 12, color: "var(--ink-1)" }}>{item.description || "暂无说明"}</div>
              <div style={{ fontSize: 12, color: "var(--ink-1)" }}>排序 {item.orderIndex}</div>
              <div className="cta-row" style={{ marginTop: 8 }}>
                <button
                  className="button ghost"
                  type="button"
                  disabled={moving || index === 0}
                  onClick={() => onSwapOrder(index, "up")}
                >
                  上移
                </button>
                <button
                  className="button ghost"
                  type="button"
                  disabled={moving || index === modules.length - 1}
                  onClick={() => onSwapOrder(index, "down")}
                >
                  下移
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p>暂无模块。</p>
      )}
    </Card>
  );
}
