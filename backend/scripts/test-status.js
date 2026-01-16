// backend/scripts/test-status.js
import { sequelize } from '../src/core/db.js';
import * as service from '../src/modules/status/services/status.service.js';
import * as repo from '../src/modules/status/repositories/status.repo.js';

async function test() {
    console.log('--- Testing Status Module ---');
    const userId = 1; // Assuming user 1 exists
    const federId = 1;

    try {
        // 1. Cleanup
        await sequelize.query('DELETE FROM "UserStatusPersonalizado" WHERE user_id = ?', { replacements: [userId] });

        // 2. Create 10 statuses
        console.log('Creating 10 custom statuses...');
        for (let i = 1; i <= 10; i++) {
            await service.createCustomStatus(userId, { emoji: '😊', texto: `Estado ${i}` });
        }
        const count = await repo.countCustomStatuses(userId);
        console.log(`Count: ${count}`);

        // 3. Try 11th
        try {
            await service.createCustomStatus(userId, { emoji: '🚫', texto: 'Should fail' });
            console.error('FAIL: 11th status created but should have failed');
        } catch (e) {
            console.log(`SUCCESS: Caught expected error: ${e.message}`);
        }

        // 4. Set current status
        const custom = await repo.getCustomStatuses(userId);
        console.log('Setting current status to first custom item...');
        await service.setStatus(userId, { custom_id: custom[0].id });

        const effective = await service.getEffectiveStatus(federId);
        console.log('Effective status:', effective);

        // 5. Test override
        console.log('Setting manual override...');
        await service.setStatus(userId, { emoji: '🍕', text: 'Comiendo pizza' });
        const effective2 = await service.getEffectiveStatus(federId);
        console.log('Effective status (override):', effective2);

    } catch (err) {
        console.error('Unexpected error during test:', err);
    } finally {
        await sequelize.close();
    }
}

test();
