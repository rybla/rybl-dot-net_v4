import { config, type ParsedDate, type PromiseElement } from "@/ontology";
import * as date_fns from "date-fns";

export default async function ParsedDate(props: {
  parsedDate: ParsedDate;
}): PromiseElement {
  switch (props.parsedDate.type) {
    case "ok":
      return (
        <div class="ParsedDate" safe>
          {date_fns.format(props.parsedDate.value, config.dateFormat_print)}
        </div>
      );
    case "error":
      return (
        <div
          class="ParsedDate error"
          onmouseover="const now = Date.now(); console.log(now)"
          safe
        >
          {props.parsedDate.value}
        </div>
      );
  }
}
