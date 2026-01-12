
import { initModels } from './src/models/registry.js';

async function main() {
  const models = await initModels();
  const users = await models.User.findAll({
    where: { id: [3, 14] },
    attributes: ['id', 'email']
  });

  console.log('USERS_START');
  users.forEach(u => {
    console.log(JSON.stringify(u));
  });
  console.log('USERS_END');
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
