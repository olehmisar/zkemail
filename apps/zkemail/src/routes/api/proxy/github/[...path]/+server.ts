export async function GET({ params }) {
  return await fetch(`https://github.com/${params.path}`);
}
