import Card from "@/components/Card";
import MathText from "@/components/MathText";
import type { VariantPack } from "../types";

type PracticeVariantAnalysisCardProps = {
  variantPack: VariantPack;
};

export function PracticeVariantAnalysisCard({ variantPack }: PracticeVariantAnalysisCardProps) {
  return (
    <Card title="错题讲解" tag="纠错">
      <details className="practice-collapsible" open>
        <summary>错因分析与解题提示</summary>
        <div className="practice-collapsible-body">
          <MathText as="p" text={variantPack.analysis} showCopyActions />
          {variantPack.hints?.length ? (
            <div className="grid practice-hint-list">
              <div className="badge">提示</div>
              {variantPack.hints.map((hint) => (
                <MathText as="div" key={hint} text={hint} />
              ))}
            </div>
          ) : null}
        </div>
      </details>
    </Card>
  );
}

type PracticeVariantTrainingCardProps = {
  variantPack: VariantPack;
  variantAnswers: Record<number, string>;
  variantResults: Record<number, boolean | null>;
  onAnswerChange: (index: number, value: string) => void;
  onSubmit: (index: number, answer: string, correctAnswer: string) => void;
};

export function PracticeVariantTrainingCard({
  variantPack,
  variantAnswers,
  variantResults,
  onAnswerChange,
  onSubmit
}: PracticeVariantTrainingCardProps) {
  if (!variantPack.variants?.length) return null;

  return (
    <Card title="变式训练" tag="迁移">
      <div className="grid practice-variant-list">
        {variantPack.variants.map((variant, index) => {
          const selected = variantAnswers[index];
          const checked = variantResults[index];
          return (
            <div className="card practice-variant-item" key={`${variant.stem}-${index}`}>
              <details className="practice-collapsible">
                <summary>变式题 {index + 1}</summary>
                <div className="practice-collapsible-body">
                  <MathText as="p" text={variant.stem} showCopyActions />
                  <div className="grid practice-option-list">
                    {variant.options.map((option) => (
                      <label className="card practice-option-card" key={option}>
                        <input
                          className="practice-option-radio"
                          type="radio"
                          name={`variant-${index}`}
                          checked={selected === option}
                          onChange={() => onAnswerChange(index, option)}
                        />
                        <MathText text={option} />
                      </label>
                    ))}
                  </div>
                  <div className="cta-row practice-variant-actions">
                    <button className="button primary" type="button" onClick={() => onSubmit(index, selected, variant.answer)} disabled={!selected}>
                      提交本题
                    </button>
                  </div>
                  {checked !== undefined && checked !== null ? (
                    <div className="practice-variant-result">
                      {checked ? "回答正确" : "回答错误"}
                      <div>
                        正确答案：<MathText text={variant.answer} />
                      </div>
                      <MathText as="div" text={variant.explanation} showCopyActions />
                    </div>
                  ) : null}
                </div>
              </details>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
