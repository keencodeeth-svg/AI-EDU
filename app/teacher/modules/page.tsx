"use client";

import { useCallback, useEffect, useState } from "react";
import ModulesClassSelectorCard from "./_components/ModulesClassSelectorCard";
import ModulesCreateCard from "./_components/ModulesCreateCard";
import ModulesListCard from "./_components/ModulesListCard";
import ModulesResourcesCard from "./_components/ModulesResourcesCard";
import type {
  ClassItem,
  ModuleItem,
  ModuleResourceItem,
  ModuleResourcePayload,
  ModuleResourceType
} from "./types";

export default function TeacherModulesPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [classId, setClassId] = useState("");
  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [moduleId, setModuleId] = useState("");
  const [resources, setResources] = useState<ModuleResourceItem[]>([]);
  const [moduleTitle, setModuleTitle] = useState("");
  const [moduleDesc, setModuleDesc] = useState("");
  const [parentId, setParentId] = useState("");
  const [orderIndex, setOrderIndex] = useState(0);
  const [resourceType, setResourceType] = useState<ModuleResourceType>("file");
  const [resourceTitle, setResourceTitle] = useState("");
  const [resourceUrl, setResourceUrl] = useState("");
  const [resourceFile, setResourceFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);

  const loadModules = useCallback(
    async (nextClassId?: string) => {
      const target = nextClassId ?? classId;
      if (!target) return;
      const res = await fetch(`/api/teacher/modules?classId=${target}`);
      const data = await res.json();
      const list = (data.data ?? []) as ModuleItem[];
      setModules(list);
      if (list.length) {
        setModuleId(list[0].id);
      } else {
        setModuleId("");
      }
    },
    [classId]
  );

  const loadResources = useCallback(
    async (nextModuleId?: string) => {
      const target = nextModuleId ?? moduleId;
      if (!target) {
        setResources([]);
        return;
      }
      const res = await fetch(`/api/teacher/modules/${target}/resources`);
      const data = await res.json();
      setResources((data.data ?? []) as ModuleResourceItem[]);
    },
    [moduleId]
  );

  useEffect(() => {
    fetch("/api/teacher/classes")
      .then((res) => res.json())
      .then((data) => {
        const list = (data.data ?? []) as ClassItem[];
        setClasses(list);
        if (list.length) {
          setClassId(list[0].id);
        }
      });
  }, []);

  useEffect(() => {
    if (!classId) return;
    loadModules(classId);
  }, [classId, loadModules]);

  useEffect(() => {
    if (!moduleId) return;
    loadResources(moduleId);
  }, [moduleId, loadResources]);

  async function handleCreateModule(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    const res = await fetch("/api/teacher/modules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        classId,
        title: moduleTitle,
        description: moduleDesc,
        parentId: parentId || undefined,
        orderIndex
      })
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data?.error ?? "创建失败");
      return;
    }
    setMessage("模块创建成功");
    setModuleTitle("");
    setModuleDesc("");
    setParentId("");
    setOrderIndex(0);
    await loadModules(classId);
  }

  async function handleAddResource(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    if (!moduleId) return;
    if (!resourceTitle) {
      setError("请填写资源标题");
      return;
    }
    if (resourceType === "file" && !resourceFile) {
      setError("请选择文件");
      return;
    }
    if (resourceType === "link" && !resourceUrl) {
      setError("请输入资源链接");
      return;
    }

    let payload: ModuleResourcePayload = {
      title: resourceTitle,
      resourceType
    };

    if (resourceType === "link") {
      payload.linkUrl = resourceUrl;
    } else if (resourceFile) {
      const contentBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result?.toString() ?? "";
          const base64 = result.includes(",") ? result.split(",")[1] : result;
          resolve(base64);
        };
        reader.onerror = () => reject(new Error("file read failed"));
        reader.readAsDataURL(resourceFile);
      });
      payload = {
        ...payload,
        fileName: resourceFile.name,
        mimeType: resourceFile.type || "application/octet-stream",
        size: resourceFile.size,
        contentBase64
      };
    }

    const res = await fetch(`/api/teacher/modules/${moduleId}/resources`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data?.error ?? "上传失败");
      return;
    }
    setMessage("资源已添加");
    setResourceTitle("");
    setResourceUrl("");
    setResourceFile(null);
    await loadResources(moduleId);
  }

  async function handleDeleteResource(resourceId: string) {
    const res = await fetch(`/api/teacher/modules/${moduleId}/resources`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resourceId })
    });
    if (res.ok) {
      loadResources(moduleId);
    }
  }

  async function swapOrder(index: number, direction: "up" | "down") {
    if (moving) return;
    const nextIndex = direction === "up" ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= modules.length) return;
    const current = modules[index];
    const target = modules[nextIndex];
    setMoving(true);
    await fetch(`/api/teacher/modules/${current.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderIndex: target.orderIndex })
    });
    await fetch(`/api/teacher/modules/${target.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderIndex: current.orderIndex })
    });
    await loadModules(classId);
    setMoving(false);
  }

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="section-head">
        <div>
          <h2>课程模块管理</h2>
          <div className="section-sub">设置章节结构、上传课件并关联作业。</div>
        </div>
        <span className="chip">模块</span>
      </div>

      <ModulesClassSelectorCard classes={classes} classId={classId} onClassChange={setClassId} />

      <ModulesCreateCard
        modules={modules}
        moduleTitle={moduleTitle}
        moduleDesc={moduleDesc}
        parentId={parentId}
        orderIndex={orderIndex}
        error={error}
        message={message}
        onSubmit={handleCreateModule}
        onModuleTitleChange={setModuleTitle}
        onModuleDescChange={setModuleDesc}
        onParentIdChange={setParentId}
        onOrderIndexChange={setOrderIndex}
      />

      <ModulesListCard modules={modules} moving={moving} onSwapOrder={swapOrder} />

      <ModulesResourcesCard
        modules={modules}
        moduleId={moduleId}
        resourceType={resourceType}
        resourceTitle={resourceTitle}
        resourceUrl={resourceUrl}
        resources={resources}
        onModuleChange={setModuleId}
        onSubmit={handleAddResource}
        onResourceTitleChange={setResourceTitle}
        onResourceTypeChange={setResourceType}
        onResourceFileChange={setResourceFile}
        onResourceUrlChange={setResourceUrl}
        onDeleteResource={handleDeleteResource}
      />
    </div>
  );
}
