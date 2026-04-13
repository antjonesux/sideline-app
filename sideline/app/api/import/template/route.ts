export async function GET() {
  const headers = [
    "drive_number",
    "play_number",
    "quarter",
    "down",
    "distance",
    "yard_line",
    "formation",
    "play_name",
    "result",
    "yards",
    "score_context",
    "note",
  ];

  const exampleRows = [
    "1,1,1,1,10,OWN 25,Gun Trips Open,PA BOOT OVER,GAIN,7,TIED,",
    "1,2,1,2,3,OWN 32,Gun Empty Base Flex,Y SHALLOW CROSS,FIRST DOWN,12,TIED,Beat cover 3",
    new Array(headers.length).fill("").join(","),
  ];

  const csv = [headers.join(","), ...exampleRows].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="sideline_game_template.csv"',
    },
  });
}
