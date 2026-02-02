export async function predict(
  endpoint: 'predict-100yr' | 'predict-50yr' | 'predict-25yr',
  inputData: {
    point: [
      flood_depth: number,
      pipe_diameter: number,
      dist_to_outlet: number,
      inlet_density: number,
    ];
  }
) {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_RAILWAY_URL}${endpoint}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inputData),
      }
    );

    if (!res.ok) {
      throw new Error(`API error: ${res.status}`);
    }

    return await res.json();
  } catch (error) {
    console.error('Prediction request failed:', error);
    throw error;
  }
}
