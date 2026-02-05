"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import {
  addComment,
  updateComment,
  deleteComment,
  togglePinComment,
} from "@/lib/actions/comments";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Pin, Pencil, Trash2, Send } from "lucide-react";

interface Comment {
  id: string;
  user_id: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
  profile?: {
    full_name: string;
  };
}

interface CommentsSectionProps {
  bookingId: string;
  organiserId: string;
  comments: Comment[];
}

function timeAgo(dateStr: string) {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

export function CommentsSection({
  bookingId,
  organiserId,
  comments,
}: CommentsSectionProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [newComment, setNewComment] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [loading, setLoading] = useState(false);

  const pinnedComments = comments.filter((c) => c.is_pinned);
  const regularComments = comments.filter((c) => !c.is_pinned);
  const isOrganiser = user?.id === organiserId;

  async function handleAdd() {
    if (!newComment.trim()) return;
    setLoading(true);
    await addComment(bookingId, newComment);
    setNewComment("");
    setLoading(false);
    router.refresh();
  }

  async function handleEdit(commentId: string) {
    if (!editContent.trim()) return;
    setLoading(true);
    await updateComment(commentId, bookingId, editContent);
    setEditingId(null);
    setEditContent("");
    setLoading(false);
    router.refresh();
  }

  async function handleDelete(commentId: string) {
    setLoading(true);
    await deleteComment(commentId, bookingId);
    setLoading(false);
    router.refresh();
  }

  async function handleTogglePin(commentId: string, currentlyPinned: boolean) {
    setLoading(true);
    await togglePinComment(commentId, bookingId, !currentlyPinned);
    setLoading(false);
    router.refresh();
  }

  function getInitials(name: string) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  function renderComment(comment: Comment) {
    const isOwn = user?.id === comment.user_id;
    const isEditing = editingId === comment.id;

    return (
      <div key={comment.id} className={`flex gap-2.5 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
        {/* Avatar */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-padel-teal text-[11px] font-semibold text-white">
          {getInitials(comment.profile?.full_name || "?")}
        </div>

        {/* Bubble */}
        <div className="max-w-[75%]">
          <div
            className={`relative rounded-2xl px-3.5 py-2.5 ${
              comment.is_pinned ? "border-l-[3px] border-l-padel-lime" : ""
            } ${
              isOwn
                ? "rounded-br-[4px] bg-[rgba(0,128,128,0.06)]"
                : "rounded-bl-[4px] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
            }`}
          >
            {/* Name + actions */}
            <div className={`mb-0.5 flex items-center gap-1.5 ${isOwn ? "justify-end" : ""}`}>
              <span className="text-[12px] font-semibold text-padel-teal">
                {comment.profile?.full_name || "Unknown"}
              </span>
              {comment.is_pinned && <span className="text-[11px]">📌</span>}

              {/* Action buttons */}
              <div className="ml-auto flex items-center gap-0.5">
                {isOrganiser && (
                  <button
                    onClick={() => handleTogglePin(comment.id, comment.is_pinned)}
                    disabled={loading}
                    className="rounded p-0.5 text-padel-gray-400 hover:text-padel-teal"
                    title={comment.is_pinned ? "Unpin" : "Pin"}
                  >
                    <Pin className="h-3 w-3" />
                  </button>
                )}
                {isOwn && !isEditing && (
                  <>
                    <button
                      onClick={() => {
                        setEditingId(comment.id);
                        setEditContent(comment.content);
                      }}
                      className="rounded p-0.5 text-padel-gray-400 hover:text-padel-charcoal"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button className="rounded p-0.5 text-padel-gray-400 hover:text-[#E53935]">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete comment?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(comment.id)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </div>
            </div>

            {/* Content */}
            {isEditing ? (
              <div className="space-y-2">
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={2}
                  className="text-[13px]"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleEdit(comment.id)}
                    disabled={loading}
                    className="h-7 rounded-lg bg-padel-teal text-xs text-white hover:bg-padel-teal-dark"
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 rounded-lg text-xs"
                    onClick={() => {
                      setEditingId(null);
                      setEditContent("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-[13px] font-medium leading-relaxed text-padel-charcoal whitespace-pre-wrap">
                {comment.content}
              </p>
            )}

            {/* Time */}
            <p className="mt-1 text-[11px] text-padel-gray-400">
              {comment.is_pinned ? "Pinned · " : ""}
              {timeAgo(comment.created_at)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-padel-gray-200 bg-padel-soft-gray shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <h3 className="text-base font-semibold text-padel-charcoal">
          Comments ({comments.length})
        </h3>
      </div>

      {/* Comments list */}
      <div className="space-y-3 px-4 pb-4">
        {pinnedComments.length > 0 && pinnedComments.map(renderComment)}

        {regularComments.length === 0 && pinnedComments.length === 0 && (
          <p className="py-4 text-center text-sm text-padel-gray-400">
            No comments yet. Be the first to post.
          </p>
        )}

        {regularComments.map(renderComment)}
      </div>

      {/* Inline input bar */}
      {user && (
        <div className="flex items-center gap-2 border-t border-padel-gray-200 bg-white px-4 py-3" style={{ borderRadius: "0 0 16px 16px" }}>
          <input
            type="text"
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleAdd();
              }
            }}
            className="flex-1 rounded-xl border-[1.5px] border-padel-gray-200 bg-white px-3 py-2 text-[13px] text-padel-charcoal placeholder:text-padel-gray-400 focus:border-padel-teal focus:outline-none focus:ring-1 focus:ring-padel-teal/10"
          />
          <button
            onClick={handleAdd}
            disabled={loading || !newComment.trim()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-padel-teal text-white transition-colors hover:bg-padel-teal-dark disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
