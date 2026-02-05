import { createClient } from "@/lib/supabase/server";
import { MembersList } from "@/components/members/members-list";

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const supabase = await createClient();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .order("full_name");

  const { data: availability } = await supabase
    .from("availability")
    .select("user_id, day_of_week, start_time, end_time")
    .order("day_of_week")
    .order("start_time");

  return (
    <MembersList
      profiles={
        ((profiles as Array<Record<string, unknown>>) || []).map((p) => ({
          id: p.id as string,
          full_name: p.full_name as string,
          email: p.email as string,
          phone: p.phone as string | null,
          skill_level: p.skill_level as string | null,
          created_at: p.created_at as string,
          is_admin: p.is_admin as boolean | undefined,
        }))
      }
      availability={
        ((availability as Array<Record<string, unknown>>) || []).map((a) => ({
          user_id: a.user_id as string,
          day_of_week: a.day_of_week as number,
          start_time: a.start_time as string,
          end_time: a.end_time as string,
        }))
      }
    />
  );
}
