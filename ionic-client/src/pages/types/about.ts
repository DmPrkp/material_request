export type AboutAccordionItem = {
  title: string;
  body: AboutAccordionBody;
};

type AboutAccordionBody = {
  paragraphs?: string[];
  items?: BodyItem[];
};

type BodyItem = {
  img: string;
  desc: string;
  link?: string;
  linkDesc?: string;
};
