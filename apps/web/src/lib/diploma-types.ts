/**
 * Shape of a single positioned element on a diploma template.
 *
 * Shared by the designer (client), the save action (server) and the PDF
 * renderer so the three stay in step. Coordinates and sizes are percentages
 * of the page (0-100) so a template renders identically at any output size.
 */
export type DiplomaElementType = "text" | "image";

export type DiplomaElement = {
  id?: string;
  type: DiplomaElementType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  align?: "left" | "center" | "right";
  text?: string;
  url?: string;
};
