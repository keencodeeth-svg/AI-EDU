import Card from "@/components/Card";
import type { StudentExamItem } from "../types";
import StudentExamItemCard from "./StudentExamItemCard";

type StudentExamSectionCardProps = {
  title: string;
  tag: string;
  items: StudentExamItem[];
  emptyText: string;
};

export default function StudentExamSectionCard({ title, tag, items, emptyText }: StudentExamSectionCardProps) {
  return (
    <Card title={title} tag={tag}>
      {items.length === 0 ? <p>{emptyText}</p> : null}
      {items.length ? (
        <div className="grid exams-list" style={{ gap: 12 }}>
          {items.map((item) => (
            <StudentExamItemCard item={item} key={item.id} />
          ))}
        </div>
      ) : null}
    </Card>
  );
}
