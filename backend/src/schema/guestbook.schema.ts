export const GUESTBOOK_TABLE = "guestbook";

export const GUESTBOOK_FIELDS = {
  authorId: {
    type: "string" as const,
    required: true,
    label: "작성자 ID",
  },
  content: {
    type: "string" as const,
    required: true,
    label: "내용",
  },
  createdAt: {
    type: "timestamp" as const,
    defaultNow: true,
    label: "작성일",
  },
  updatedAt: {
    type: "timestamp" as const,
    defaultNow: true,
    label: "수정일",
  },
};
