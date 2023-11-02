import { BlockObjectRequest } from "@notionhq/client/build/src/api-endpoints.js";

interface FontOptions {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}

const heading_2 = (
  content: string,
  { bold, italic, underline }: FontOptions = {
    bold: false,
    italic: false,
    underline: false,
  },
): BlockObjectRequest => ({
  object: "block",
  heading_2: {
    rich_text: [
      {
        text: {
          content: content,
        },
        annotations: {
          bold: bold,
          italic: italic,
          underline: underline,
        },
      },
    ],
  },
});

const paragraph = (
  content: string,
  { bold, italic, underline }: FontOptions = {
    bold: false,
    italic: false,
    underline: false,
  },
): BlockObjectRequest => ({
  object: "block",
  paragraph: {
    rich_text: [
      {
        text: {
          content: content,
        },
        annotations: {
          bold: bold,
          italic: italic,
          underline: underline,
        },
      },
    ],
  },
});

const fancyParagraph = (
  content: string,
  { bold, italic, underline }: FontOptions = {
    bold: false,
    italic: false,
    underline: false,
  },
): BlockObjectRequest => ({
  object: "block",
  paragraph: {
    rich_text: [
      {
        text: {
          content: content,
        },
        annotations: {
          bold: bold,
          italic: italic,
          underline: underline,
        },
      },
    ],
  },
});

const todo = (
  content: string,
  { bold, italic, underline }: FontOptions = {
    bold: false,
    italic: false,
    underline: false,
  },
): BlockObjectRequest => ({
  object: "block",
  to_do: {
    rich_text: [
      {
        text: {
          content: content,
        },
        annotations: {
          bold: bold,
          italic: italic,
          underline: underline,
        },
      },
    ],
    checked: false,
  },
});

type BulletBlock = Extract<BlockObjectRequest, { bulleted_list_item: any }>;
type BulletChildren = BulletBlock["bulleted_list_item"]["children"];
const bullet = (
  content: string,
  { bold, italic, underline }: FontOptions = {
    bold: false,
    italic: false,
    underline: false,
  },
  children?: BulletChildren,
): BlockObjectRequest => ({
  object: "block",
  bulleted_list_item: {
    rich_text: [
      {
        text: {
          content: content,
        },
        annotations: {
          bold: bold,
          italic: italic,
          underline: underline,
        },
      },
    ],
    children: children,
  },
});

const bulletChildren = (contentList: string[]): BulletChildren => {
  const blockList = contentList.map((content) => {
    return {
      bulleted_list_item: {
        rich_text: [
          {
            text: {
              content: content,
            },
          },
        ],
      },
    };
  });
  return blockList;
};

type ToggleBlock = Extract<BlockObjectRequest, { toggle: any }>;
type ToggleChildren = ToggleBlock["toggle"]["children"];
const toggle = (
  content: string,
  children?: ToggleChildren,
): BlockObjectRequest => {
  return {
    object: "block",
    toggle: {
      rich_text: [
        {
          text: {
            content: content,
          },
        },
      ],
      children: children,
    },
  };
};

const toggleChildren = (contentList: string[]): ToggleChildren => {
  const blockList = contentList.map((content) => {
    return {
      paragraph: {
        rich_text: [
          {
            text: {
              content: content,
            },
          },
        ],
      },
    };
  });
  return blockList;
};

const divider = (): BlockObjectRequest => ({
  object: "block",
  divider: {},
});

export {
  heading_2,
  paragraph,
  fancyParagraph,
  todo,
  bullet,
  bulletChildren,
  toggle,
  toggleChildren,
  divider,
};
