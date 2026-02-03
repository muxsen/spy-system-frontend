export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const cleanText = (text: string): string => {
  return text.trim().replace(/\s+/g, ' ');
};
