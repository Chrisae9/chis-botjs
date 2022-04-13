declare module "user-time" {
  export default (
    input: string,
    options?: { defaultTimeOfDay: "am" | "pm" }
  ): { formattedTime: string; ISOString: string } => {};
}
