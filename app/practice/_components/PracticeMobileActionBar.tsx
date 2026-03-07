type PracticeMobileActionBarProps = {
  questionVisible: boolean;
  canSubmit: boolean;
  timedMode: boolean;
  onLoadQuestion: () => void;
  onSubmit: () => void;
};

export default function PracticeMobileActionBar({
  questionVisible,
  canSubmit,
  timedMode,
  onLoadQuestion,
  onSubmit
}: PracticeMobileActionBarProps) {
  return (
    <div className="practice-mobile-action-bar" role="toolbar" aria-label="练习快捷操作">
      <button className="button secondary" type="button" onClick={onLoadQuestion}>
        {timedMode ? "开始限时" : "获取题目"}
      </button>
      <button className="button primary" type="button" onClick={onSubmit} disabled={!canSubmit}>
        提交答案
      </button>
      <button className="button ghost" type="button" onClick={onLoadQuestion} disabled={!questionVisible}>
        换一题
      </button>
    </div>
  );
}
