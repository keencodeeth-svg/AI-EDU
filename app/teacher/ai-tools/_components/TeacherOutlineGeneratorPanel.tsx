import type { Dispatch, FormEventHandler, SetStateAction } from "react";
import Card from "@/components/Card";
import { SUBJECT_LABELS } from "@/lib/constants";
import type { ClassItem, KnowledgePoint, OutlineFormState, OutlineResult } from "../types";
import TeacherAiQualityCard from "./TeacherAiQualityCard";

const fieldStyle = {
  width: "100%",
  padding: 10,
  borderRadius: 10,
  border: "1px solid var(--stroke)"
} as const;

type TeacherOutlineGeneratorPanelProps = {
  classes: ClassItem[];
  outlineForm: OutlineFormState;
  setOutlineForm: Dispatch<SetStateAction<OutlineFormState>>;
  outlinePoints: KnowledgePoint[];
  loading: boolean;
  outlineError: string | null;
  outlineResult: OutlineResult | null;
  onGenerateOutline: FormEventHandler<HTMLFormElement>;
};

export default function TeacherOutlineGeneratorPanel({
  classes,
  outlineForm,
  setOutlineForm,
  outlinePoints,
  loading,
  outlineError,
  outlineResult,
  onGenerateOutline
}: TeacherOutlineGeneratorPanelProps) {
  return (
    <Card title="AI 课堂讲稿生成" tag="讲稿">
      <form onSubmit={onGenerateOutline} style={{ display: "grid", gap: 12 }}>
        <label>
          <div className="section-title">选择班级</div>
          <select
            value={outlineForm.classId}
            onChange={(event) => setOutlineForm((prev) => ({ ...prev, classId: event.target.value, knowledgePointIds: [] }))}
            style={fieldStyle}
          >
            {classes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · {SUBJECT_LABELS[item.subject] ?? item.subject} · {item.grade} 年级
              </option>
            ))}
          </select>
        </label>
        <label>
          <div className="section-title">主题</div>
          <input
            value={outlineForm.topic}
            onChange={(event) => setOutlineForm((prev) => ({ ...prev, topic: event.target.value }))}
            placeholder="例如：分数的意义与比较"
            style={fieldStyle}
          />
        </label>
        <label>
          <div className="section-title">关联知识点（可选）</div>
          <select
            multiple
            value={outlineForm.knowledgePointIds}
            onChange={(event) =>
              setOutlineForm((prev) => ({
                ...prev,
                knowledgePointIds: Array.from(event.target.selectedOptions).map((opt) => opt.value)
              }))
            }
            style={{ ...fieldStyle, height: 120 }}
          >
            {outlinePoints.map((item) => (
              <option key={item.id} value={item.id}>
                {item.chapter} · {item.title}
              </option>
            ))}
          </select>
        </label>
        <button className="button primary" type="submit" disabled={loading}>
          {loading ? "生成中..." : "生成讲稿"}
        </button>
      </form>
      {outlineError ? <div className="status-note error" style={{ marginTop: 8 }}>{outlineError}</div> : null}

      {outlineResult?.outline ? (
        <div className="grid" style={{ gap: 12, marginTop: 12 }}>
          <div className="card">
            <div className="section-title">教学目标</div>
            <ul style={{ margin: "8px 0 0 16px" }}>
              {outlineResult.outline.objectives?.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="card">
            <div className="section-title">重点难点</div>
            <ul style={{ margin: "8px 0 0 16px" }}>
              {outlineResult.outline.keyPoints?.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="card">
            <div className="section-title">PPT 大纲</div>
            <div className="grid" style={{ gap: 8 }}>
              {outlineResult.outline.slides?.map((slide, index) => (
                <div key={`${slide.title}-${index}`}>
                  <div style={{ fontWeight: 600 }}>{slide.title}</div>
                  <ul style={{ margin: "4px 0 0 16px" }}>
                    {slide.bullets?.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="section-title">板书步骤</div>
            <ol style={{ margin: "8px 0 0 16px" }}>
              {outlineResult.outline.blackboardSteps?.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          </div>
          <TeacherAiQualityCard payload={outlineResult} />
        </div>
      ) : null}
    </Card>
  );
}
