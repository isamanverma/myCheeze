import { StampDiary } from "@/components/stamp-diary";

export default function Home() {
  const now = new Date();

  return (
    <StampDiary
      initialYear={now.getFullYear()}
      initialMonth={now.getMonth() + 1}
      initialUserId={null}
      initialStamps={[]}
    />
  );
}
