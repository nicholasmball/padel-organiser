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
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

  function renderComment(comment: Comment) {
    const isOwn = user?.id === comment.user_id;
    const isEditing = editingId === comment.id;

    return (
      <div key={comment.id} className="space-y-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
              {comment.profile?.full_name
                ?.split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2) || "?"}
            </div>
            <div>
              <span className="text-sm font-medium">
                {comment.profile?.full_name || "Unknown"}
              </span>
              <span className="ml-2 text-xs text-muted-foreground">
                {timeAgo(comment.created_at)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {comment.is_pinned && (
              <Pin className="h-3.5 w-3.5 text-primary" />
            )}
            {isOrganiser && (
              <button
                onClick={() => handleTogglePin(comment.id, comment.is_pinned)}
                disabled={loading}
                className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                title={comment.is_pinned ? "Unpin" : "Pin"}
              >
                <Pin className="h-3.5 w-3.5" />
              </button>
            )}
            {isOwn && !isEditing && (
              <>
                <button
                  onClick={() => {
                    setEditingId(comment.id);
                    setEditContent(comment.content);
                  }}
                  className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
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
        {isEditing ? (
          <div className="ml-9 space-y-2">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={2}
              className="text-sm"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => handleEdit(comment.id)}
                disabled={loading}
              >
                Save
              </Button>
              <Button
                size="sm"
                variant="outline"
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
          <p className="ml-9 text-sm whitespace-pre-wrap">{comment.content}</p>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Comments ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {pinnedComments.length > 0 && (
          <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
            <p className="text-xs font-medium uppercase text-primary">
              Pinned
            </p>
            {pinnedComments.map(renderComment)}
          </div>
        )}

        {regularComments.length === 0 && pinnedComments.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No comments yet. Be the first to post.
          </p>
        )}

        {regularComments.map(renderComment)}

        {user && (
          <div className="flex gap-2">
            <Textarea
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={2}
              className="text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleAdd();
                }
              }}
            />
            <Button
              size="icon"
              onClick={handleAdd}
              disabled={loading || !newComment.trim()}
              className="shrink-0 self-end"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
