import HTML from "@kitajs/html";
import Header from "@/build/component/Header";
import Footer from "@/build/component/Footer";
import { config } from "@/ontology";

export default function Top(props: {
  resource_name: string;
  resource_shortname: string;
  content_head?: JSX.Element;
  children: HTML.Children;
}): JSX.Element {
  return (
    <>
      {"<!doctype html>"}
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0"
          />
          <title safe>
            {config.name_of_website} | {props.resource_name}
          </title>
          <link rel="stylesheet" href="/asset/style/common.css" />
          <link rel="stylesheet" href="/asset/style/util.css" />
          <link rel="stylesheet" href="/asset/style/Top.css" />
          <link rel="stylesheet" href="/asset/style/Tag.css" />
          <link rel="stylesheet" href="/asset/style/ParsedDate.css" />
          <link rel="stylesheet" href="/asset/style/Header.css" />
          <link rel="stylesheet" href="/asset/style/Footer.css" />
          <link rel="stylesheet" href="/asset/style/Raindrops.css" />
          <link rel="stylesheet" href="/asset/style/Markdown.css" />
          {props.content_head as "safe"}
        </head>
        <body>
          <Raindrops />
          <Header resource_name={props.resource_shortname} />
          <main>{props.children}</main>
          <Footer />
        </body>
      </html>
    </>
  );
}

function Raindrops(props: {}) {
  return (
    <div id="raindrop_container">
      <div class="raindrop"></div>
      <div class="raindrop"></div>
      <div class="raindrop"></div>
      <div class="raindrop"></div>
      <div class="raindrop"></div>
      <div class="raindrop"></div>
      <div class="raindrop"></div>
      <div class="raindrop"></div>
      <div class="raindrop"></div>
      <div class="raindrop"></div>
      <div class="raindrop"></div>
      <div class="raindrop"></div>
      <div class="raindrop"></div>
      <div class="raindrop"></div>
      <div class="raindrop"></div>
      <div class="raindrop"></div>
      <div class="raindrop"></div>
      <div class="raindrop"></div>
      <div class="raindrop"></div>
      <div class="raindrop"></div>
      <div class="raindrop"></div>
      <div class="raindrop"></div>
      <div class="raindrop"></div>
      <div class="raindrop"></div>
      <div class="raindrop"></div>
      <div class="raindrop"></div>
      <div class="raindrop"></div>
      <div class="raindrop"></div>
      <div class="raindrop"></div>
      <div class="raindrop"></div>
      <div class="raindrop"></div>
      <div class="raindrop"></div>
      <div class="raindrop"></div>
      <div class="raindrop"></div>
      <div class="raindrop"></div>
      <div class="raindrop"></div>
      <div class="raindrop"></div>
      <div class="raindrop"></div>
      <div class="raindrop"></div>
      <div class="raindrop"></div>
    </div>
  );
}
