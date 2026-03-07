import Card from "@/components/Card";
import { GRADE_OPTIONS, SUBJECT_LABELS, SUBJECT_OPTIONS } from "@/lib/constants";
import type { CourseModule } from "@/lib/modules";
import type { AssignmentFormState, ClassFormState, ClassItem, KnowledgePoint, StudentFormState } from "../types";

type TeacherCreateClassCardProps = {
  classForm: ClassFormState;
  loading: boolean;
  onChange: (patch: Partial<ClassFormState>) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

export function TeacherCreateClassCard({ classForm, loading, onChange, onSubmit }: TeacherCreateClassCardProps) {
  return (
    <Card title="创建班级">
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <label>
          <div className="section-title">班级名称</div>
          <input value={classForm.name} onChange={(event) => onChange({ name: event.target.value })} placeholder="四年级一班" style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }} />
        </label>
        <label>
          <div className="section-title">学科</div>
          <select value={classForm.subject} onChange={(event) => onChange({ subject: event.target.value })} style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}>
            {SUBJECT_OPTIONS.map((subject) => <option key={subject.value} value={subject.value}>{subject.label}</option>)}
          </select>
        </label>
        <label>
          <div className="section-title">年级</div>
          <select value={classForm.grade} onChange={(event) => onChange({ grade: event.target.value })} style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}>
            {GRADE_OPTIONS.map((grade) => <option key={grade.value} value={grade.value}>{grade.label}</option>)}
          </select>
        </label>
        <button className="button primary" type="submit" disabled={loading}>{loading ? "提交中..." : "创建班级"}</button>
      </form>
    </Card>
  );
}

type TeacherAddStudentCardProps = {
  studentForm: StudentFormState;
  classes: ClassItem[];
  loading: boolean;
  onChange: (patch: Partial<StudentFormState>) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

export function TeacherAddStudentCard({ studentForm, classes, loading, onChange, onSubmit }: TeacherAddStudentCardProps) {
  return (
    <Card title="添加学生">
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <label>
          <div className="section-title">选择班级</div>
          <select value={studentForm.classId} onChange={(event) => onChange({ classId: event.target.value })} style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}>
            {classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <label>
          <div className="section-title">学生邮箱</div>
          <input value={studentForm.email} onChange={(event) => onChange({ email: event.target.value })} placeholder="student@demo.com" style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }} />
        </label>
        <button className="button primary" type="submit" disabled={loading}>{loading ? "提交中..." : "加入班级"}</button>
      </form>
    </Card>
  );
}

type TeacherAssignmentComposerCardProps = {
  classes: ClassItem[];
  modules: CourseModule[];
  assignmentForm: AssignmentFormState;
  filteredPoints: KnowledgePoint[];
  loading: boolean;
  assignmentError: string | null;
  assignmentMessage: string | null;
  onChange: (patch: Partial<AssignmentFormState>) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

export function TeacherAssignmentComposerCard({ classes, modules, assignmentForm, filteredPoints, loading, assignmentError, assignmentMessage, onChange, onSubmit }: TeacherAssignmentComposerCardProps) {
  return (
    <Card title="作业发布">
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <label>
          <div className="section-title">选择班级</div>
          <select value={assignmentForm.classId} onChange={(event) => onChange({ classId: event.target.value })} style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}>
            {classes.map((item) => <option key={item.id} value={item.id}>{item.name} · {SUBJECT_LABELS[item.subject] ?? item.subject} · {item.grade} 年级</option>)}
          </select>
        </label>
        <label>
          <div className="section-title">关联模块（可选）</div>
          <select value={assignmentForm.moduleId} onChange={(event) => onChange({ moduleId: event.target.value })} style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}>
            <option value="">不关联模块</option>
            {modules.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
          </select>
        </label>
        <label>
          <div className="section-title">作业标题</div>
          <input value={assignmentForm.title} onChange={(event) => onChange({ title: event.target.value })} placeholder="本周单元练习" style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }} />
        </label>
        <label>
          <div className="section-title">作业说明</div>
          <textarea value={assignmentForm.description} onChange={(event) => onChange({ description: event.target.value })} placeholder="建议完成后再做错题总结。" rows={3} style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }} />
        </label>
        <div className="grid grid-2">
          <label>
            <div className="section-title">截止日期</div>
            <input type="date" value={assignmentForm.dueDate} onChange={(event) => onChange({ dueDate: event.target.value })} style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }} />
          </label>
          <label>
            <div className="section-title">作业类型</div>
            <select value={assignmentForm.submissionType} onChange={(event) => onChange({ submissionType: event.target.value as AssignmentFormState["submissionType"] })} style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}>
              <option value="quiz">在线题目</option>
              <option value="upload">上传作业</option>
              <option value="essay">作文/主观题</option>
            </select>
          </label>
        </div>
        {assignmentForm.submissionType === "quiz" ? (
          <label>
            <div className="section-title">题目数量</div>
            <input type="number" min={1} max={50} value={assignmentForm.questionCount} onChange={(event) => onChange({ questionCount: Number(event.target.value) })} style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }} />
          </label>
        ) : (
          <label>
            <div className="section-title">最多上传</div>
            <input type="number" min={1} max={10} value={assignmentForm.maxUploads} onChange={(event) => onChange({ maxUploads: Number(event.target.value) })} style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }} />
            <div style={{ marginTop: 6, fontSize: 12, color: "var(--ink-1)" }}>{assignmentForm.submissionType === "essay" ? "作文/主观题可选上传纸质作业或草稿图片。" : "支持学生上传图片或 PDF 作业。"}</div>
          </label>
        )}
        {assignmentForm.submissionType === "quiz" ? (
          <>
            <div className="grid grid-2">
              <label>
                <div className="section-title">出题方式</div>
                <select value={assignmentForm.mode} onChange={(event) => onChange({ mode: event.target.value })} style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}>
                  <option value="bank">题库抽题</option>
                  <option value="ai">AI 生成</option>
                </select>
              </label>
              <label>
                <div className="section-title">难度</div>
                <select value={assignmentForm.difficulty} onChange={(event) => onChange({ difficulty: event.target.value })} style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}>
                  <option value="easy">简单</option>
                  <option value="medium">中等</option>
                  <option value="hard">较难</option>
                </select>
              </label>
            </div>
            <label>
              <div className="section-title">题型</div>
              <select value={assignmentForm.questionType} onChange={(event) => onChange({ questionType: event.target.value })} style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}>
                <option value="choice">选择题</option>
                <option value="application">应用题</option>
                <option value="calculation">计算题</option>
              </select>
            </label>
            <label>
              <div className="section-title">限定知识点（可选）</div>
              <select value={assignmentForm.knowledgePointId} onChange={(event) => onChange({ knowledgePointId: event.target.value })} style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}>
                <option value="">不限</option>
                {filteredPoints.map((item) => <option key={item.id} value={item.id}>{item.unit ? `${item.unit} / ` : ""}{item.chapter} · {item.title}</option>)}
              </select>
            </label>
            {assignmentForm.mode === "ai" ? <div style={{ fontSize: 12, color: "var(--ink-1)" }}>AI 生成会写入题库。建议选择知识点并确认已配置 LLM。</div> : null}
          </>
        ) : null}
        {assignmentForm.submissionType !== "quiz" ? (
          <label>
            <div className="section-title">批改重点（可选）</div>
            <textarea value={assignmentForm.gradingFocus} onChange={(event) => onChange({ gradingFocus: event.target.value })} placeholder={assignmentForm.submissionType === "essay" ? "例如：结构完整、语言表达、错别字与标点。" : "例如：重视列式步骤、书写规范与验算。"} rows={3} style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }} />
          </label>
        ) : null}
        {assignmentError ? <div style={{ color: "#b42318", fontSize: 13 }}>{assignmentError}</div> : null}
        {assignmentMessage ? <div style={{ color: "#1a7f37", fontSize: 13 }}>{assignmentMessage}</div> : null}
        <button className="button primary" type="submit" disabled={loading}>{loading ? "提交中..." : "发布作业"}</button>
      </form>
    </Card>
  );
}
