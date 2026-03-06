import React from "react";
import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import supabase from "@/lib/supabase/client";

type Props = {
  user: any | null;
};

export const getServerSideProps: GetServerSideProps<Props> = async (context) => {
  const id = context.params?.id as string;

  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("id", id)
    .single();

  return {
    props: {
      user: data ?? null,
    },
  };
};

export default function UserPage({
  user,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return <pre>{JSON.stringify(user, null, 2)}</pre>;
}