import type { FormEvent } from "react";
import Card from "@/components/Card";
import EduIcon from "@/components/EduIcon";
import type { ModuleItem, ModuleResourceItem, ModuleResourceType } from "../types";

type ModulesResourcesCardProps = {
  modules: ModuleItem[];
  moduleId: string;
  resourceType: ModuleResourceType;
  resourceTitle: string;
  resourceUrl: string;
  resources: ModuleResourceItem[];
  onModuleChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  onResourceTitleChange: (value: string) => void;
  onResourceTypeChange: (value: ModuleResourceType) => void;
  onResourceFileChange: (file: File | null) => void;
  onResourceUrlChange: (value: string) => void;
  onDeleteResource: (resourceId: string) => void | Promise<void>;
};

export default function ModulesResourcesCard({
  modules,
  moduleId,
  resourceType,
  resourceTitle,
  resourceUrl,
  resources,
  onModuleChange,
  onSubmit,
  onResourceTitleChange,
  onResourceTypeChange,
  onResourceFileChange,
  onResourceUrlChange,
  onDeleteResource
}: ModulesResourcesCardProps) {
  return (
    <Card title="模块资源" tag="课件">
      <div className="feature-card">
        <EduIcon name="board" />
        <p>上传课件或添加链接资源。</p>
      </div>
      <label>
        <div className="section-title">选择模块</div>
        <select
          value={moduleId}
          onChange={(event) => onModuleChange(event.target.value)}
          style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
        >
          <option value="">请选择模块</option>
          {modules.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title}
            </option>
          ))}
        </select>
      </label>
      {moduleId ? (
        <form onSubmit={onSubmit} style={{ display: "grid", gap: 12, marginTop: 12 }}>
          <label>
            <div className="section-title">资源标题</div>
            <input
              value={resourceTitle}
              onChange={(event) => onResourceTitleChange(event.target.value)}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            />
          </label>
          <label>
            <div className="section-title">资源类型</div>
            <select
              value={resourceType}
              onChange={(event) => onResourceTypeChange(event.target.value as ModuleResourceType)}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            >
              <option value="file">上传文件</option>
              <option value="link">链接</option>
            </select>
          </label>
          {resourceType === "file" ? (
            <label>
              <div className="section-title">上传文件</div>
              <input type="file" onChange={(event) => onResourceFileChange(event.target.files?.[0] ?? null)} />
            </label>
          ) : (
            <label>
              <div className="section-title">资源链接</div>
              <input
                value={resourceUrl}
                onChange={(event) => onResourceUrlChange(event.target.value)}
                placeholder="https://"
                style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
              />
            </label>
          )}
          <button className="button primary" type="submit">
            添加资源
          </button>
        </form>
      ) : (
        <p style={{ marginTop: 8 }}>请先选择模块。</p>
      )}
      <div style={{ marginTop: 12 }}>
        {resources.length ? (
          <div className="grid" style={{ gap: 10 }}>
            {resources.map((item) => (
              <div className="card" key={item.id}>
                <div className="section-title">{item.title}</div>
                <div style={{ fontSize: 12, color: "var(--ink-1)" }}>
                  {item.resourceType === "link" ? item.linkUrl : item.fileName}
                </div>
                <button
                  className="button ghost"
                  type="button"
                  onClick={() => onDeleteResource(item.id)}
                  style={{ marginTop: 8 }}
                >
                  删除
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p>暂无资源。</p>
        )}
      </div>
    </Card>
  );
}
