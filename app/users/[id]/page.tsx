import supabase from "@/lib/supabase/client";

type PageProps = {
  params: { id: string };
};

export default async function UserPage({ params }: PageProps) {
  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("id", params.id)
    .single();

  return <pre>{JSON.stringify(data ?? null, null, 2)}</pre>;
}