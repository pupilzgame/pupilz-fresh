// Auto-setup script for Supabase leaderboard table
// This uses your existing Vercel environment variables

async function setupDatabase() {
  console.log('🚀 Setting up leaderboard database...');

  try {
    // Test the API endpoint first
    console.log('1. Testing API connection...');
    const testResponse = await fetch('http://localhost:3000/api/leaderboard');
    console.log('API test result:', testResponse.status);

    if (testResponse.status === 500) {
      console.log('2. Database needs setup - this is expected!');
    }

    // Create the table by calling our API with a test entry
    console.log('3. Creating table via API...');
    const setupResponse = await fetch('http://localhost:3000/api/leaderboard', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        playerName: 'SETUP',
        score: 100000,
        level: 5,
        victory: true
      }),
    });

    const result = await setupResponse.json();
    console.log('Setup result:', result);

    if (result.success) {
      console.log('✅ SUCCESS! Database table created and working!');

      // Add more sample data
      console.log('4. Adding sample leaderboard entries...');
      const sampleEntries = [
        { playerName: 'ACE', score: 125000, level: 5, victory: true },
        { playerName: 'TOP', score: 89500, level: 4, victory: false },
        { playerName: 'PRO', score: 67200, level: 3, victory: false },
        { playerName: 'FLY', score: 45800, level: 2, victory: false },
      ];

      for (const entry of sampleEntries) {
        await fetch('http://localhost:3000/api/leaderboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry),
        });
        console.log(`Added ${entry.playerName} to leaderboard`);
      }

      console.log('🎉 Database setup complete! Your leaderboard is ready!');
    } else {
      console.error('❌ Setup failed:', result.error);
    }

  } catch (error) {
    console.error('❌ Setup script failed:', error);
    console.log('\n💡 Make sure:');
    console.log('1. Your app is running (npm start)');
    console.log('2. Supabase environment variables are set in Vercel');
    console.log('3. Supabase integration is connected');
  }
}

setupDatabase();