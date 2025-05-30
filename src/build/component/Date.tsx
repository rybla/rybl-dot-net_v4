import type { PromiseElement } from "@/ontology";

export default async function Date(props: { date: string }): PromiseElement {
  return <div safe>{props.date}</div>;
}
