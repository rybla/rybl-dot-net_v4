import Top from "@/build/component/Top";

export default function Index(props: { previews: JSX.Element[] }): JSX.Element {
  return (
    <Top
      resource_name="Index"
      content_head={
        <>
          <link rel="stylesheet" href="/asset/style/Index.css" />
          <link rel="stylesheet" href="/asset/style/PostPreview.css" />
        </>
      }
    >
      <div class="previews">
        {props.previews.map((e) => (
          <div class="item">{e}</div>
        ))}
      </div>
    </Top>
  );
}
