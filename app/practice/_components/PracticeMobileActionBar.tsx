type PracticeMobileActionBarProps = {
  questionVisible: boolean;
  resultVisible: boolean;
  canSubmit: boolean;
  timedMode: boolean;
  busy: boolean;
  loadingVariants: boolean;
  hasVariants: boolean;
  onLoadQuestion: () => void;
  onSubmit: () => void;
  onLoadVariants: () => void;
};

export default function PracticeMobileActionBar({
  questionVisible,
  resultVisible,
  canSubmit,
  timedMode,
  busy,
  loadingVariants,
  hasVariants,
  onLoadQuestion,
  onSubmit,
  onLoadVariants
}: PracticeMobileActionBarProps) {
  if (resultVisible) {
    return (
      <div className="practice-mobile-action-bar" role="toolbar" aria-label="练习快捷操作">
        <button className="button secondary" type="button" onClick={onLoadQuestion} disabled={busy}>
          {busy ? "处理中..." : "下一题"}
        </button>
        <button className="button primary" type="button" onClick={onLoadVariants} disabled={busy || loadingVariants || hasVariants}>
          {loadingVariants ? "生成中..." : hasVariants ? "变式已生成" : "变式训练"}
        </button>
        <a className="button ghost practice-mobile-action-link" href="#practice-result">
          看解析
        </a>
      </div>
    );
  }

  return (
    <div className="practice-mobile-action-bar" role="toolbar" aria-label="练习快捷操作">
      <button className="button secondary" type="button" onClick={onLoadQuestion} disabled={busy}>
        {busy ? "获取中..." : timedMode && !questionVisible ? "开始限时" : questionVisible ? "换一题" : "获取题目"}
      </button>
      <button className="button primary" type="button" onClick={onSubmit} disabled={!canSubmit || busy}>
        {busy && canSubmit ? "判题中..." : "提交答案"}
      </button>
      <a className="button ghost practice-mobile-action-link" href="#practice-settings">
        看设置
      </a>
    </div>
  );
}
