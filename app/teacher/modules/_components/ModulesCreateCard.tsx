import type { FormEvent } from "react";
import Card from "@/components/Card";
import EduIcon from "@/components/EduIcon";
import type { ModuleItem } from "../types";

type ModulesCreateCardProps = {
  modules: ModuleItem[];
  moduleTitle: string;
  moduleDesc: string;
  parentId: string;
  orderIndex: number;
  error: string | null;
  message: string | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  onModuleTitleChange: (value: string) => void;
  onModuleDescChange: (value: string) => void;
  onParentIdChange: (value: string) => void;
  onOrderIndexChange: (value: number) => void;
};

export default function ModulesCreateCard({
  modules,
  moduleTitle,
  moduleDesc,
  parentId,
  orderIndex,
  error,
  message,
  onSubmit,
  onModuleTitleChange,
  onModuleDescChange,
  onParentIdChange,
  onOrderIndexChange
}: ModulesCreateCardProps) {
  return (
    <Card title="新增模块" tag="章节">
      <div className="feature-card">
        <EduIcon name="book" />
        <p>创建章节/单元结构，支持层级模块。</p>
      </div>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <label>
          <div className="section-title">模块标题</div>
          <input
            value={moduleTitle}
            onChange={(event) => onModuleTitleChange(event.target.value)}
            style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
          />
        </label>
        <label>
          <div className="section-title">模块说明（可选）</div>
          <textarea
            value={moduleDesc}
            onChange={(event) => onModuleDescChange(event.target.value)}
            rows={2}
            style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
          />
        </label>
        <label>
          <div className="section-title">上级模块（可选）</div>
          <select
            value={parentId}
            onChange={(event) => onParentIdChange(event.target.value)}
            style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
          >
            <option value="">无</option>
            {modules.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          <div className="section-title">排序序号</div>
          <input
            type="number"
            value={orderIndex}
            onChange={(event) => onOrderIndexChange(Number(event.target.value))}
            style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
          />
        </label>
        {error ? <div style={{ color: "#b42318", fontSize: 13 }}>{error}</div> : null}
        {message ? <div style={{ color: "#027a48", fontSize: 13 }}>{message}</div> : null}
        <button className="button primary" type="submit">
          创建模块
        </button>
      </form>
    </Card>
  );
}
