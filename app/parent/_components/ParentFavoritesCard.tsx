import Card from "@/components/Card";
import EduIcon from "@/components/EduIcon";
import MathText from "@/components/MathText";
import type { FavoriteItem } from "../types";

type ParentFavoritesCardProps = {
  favorites: FavoriteItem[];
};

export default function ParentFavoritesCard({ favorites }: ParentFavoritesCardProps) {
  return (
    <Card title="收藏题目" tag="复习">
      <div className="feature-card">
        <EduIcon name="book" />
        <p>孩子收藏的重点题目与标签。</p>
      </div>
      {favorites.length ? (
        <div className="grid" style={{ gap: 8, marginTop: 12 }}>
          {favorites.slice(0, 5).map((item) => (
            <div className="card" key={item.id}>
              <div className="section-title">
                <MathText text={item.question?.stem ?? "题目"} />
              </div>
              <div style={{ fontSize: 12, color: "var(--ink-1)" }}>
                {item.question?.knowledgePointTitle ?? "知识点"} · {item.question?.grade ?? "-"} 年级
              </div>
              <div style={{ fontSize: 12, color: "var(--ink-1)", marginTop: 6 }}>
                标签：{item.tags?.length ? item.tags.join("、") : "未设置"}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ marginTop: 8 }}>暂无收藏记录。</p>
      )}
    </Card>
  );
}
