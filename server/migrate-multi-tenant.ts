import 'dotenv/config';
import { db } from './db';
import { weddings, users, rsvpResponses, contributions } from '../shared/schema';
import { eq, isNull } from 'drizzle-orm';

async function migrate() {
    console.log('🔄 Starting multi-tenant migration...');

    try {
        // 1. Get or create a default owner
        let [owner] = await db.select().from(users).limit(1);
        if (!owner) {
            console.log('👤 No users found, creating a default owner...');
            [owner] = await db.insert(users).values({
                id: 'system-default',
                email: 'admin@libala.io',
                firstName: 'System',
                lastName: 'Admin',
            }).returning();
        }
        console.log(`👤 Using owner: ${owner.firstName} (${owner.id})`);

        // 2. Create a default wedding
        console.log('💍 Creating default wedding...');
        const [defaultWedding] = await db.insert(weddings).values({
            ownerId: owner.id,
            slug: 'default-wedding',
            title: 'Mon Premier Mariage',
            currentPlan: 'free',
            config: {
                theme: { primaryColor: '#D4AF37', secondaryColor: '#FFFFFF', fontFamily: 'serif' },
                seo: { title: 'Mon Premier Mariage', description: 'Rejoignez-nous' },
                features: { jokesEnabled: true, giftsEnabled: true, cagnotteEnabled: true }
            },
        }).onConflictDoNothing().returning();

        const weddingId = defaultWedding?.id || (await db.select().from(weddings).where(eq(weddings.slug, 'default-wedding')))[0].id;
        console.log(`💍 Wedding ID: ${weddingId}`);

        // 3. Link existing RSVP responses
        console.log('📝 Linking RSVP responses...');
        const updatedRsvps = await db.update(rsvpResponses)
            .set({ weddingId })
            .where(isNull(rsvpResponses.weddingId))
            .returning();
        console.log(`✅ Updated ${updatedRsvps.length} RSVP responses.`);

        // 4. Link existing contributions
        console.log('💰 Linking contributions...');
        const updatedContributions = await db.update(contributions)
            .set({ weddingId })
            .where(isNull(contributions.weddingId))
            .returning();
        console.log(`✅ Updated ${updatedContributions.length} contributions.`);

        console.log('🎉 Migration completed successfully!');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrate();
