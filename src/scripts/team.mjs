export function initTeam() {
  const select = document.querySelector('#team-question');
  if (!select) return;
  const teams = [
    { nodes: ['Machine learning', 'Regulation & law', 'Statistics', 'Risk', 'Organisational design', 'Operations'], rationale: 'Rules, model behaviour and accountability move together. The disciplines need to reason jointly.' },
    { nodes: ['Machine learning', 'Behavioural science', 'Human factors', 'Process & operations', 'Product', 'Change delivery'], rationale: 'What is technically possible, what people will absorb and what the process can tolerate are different questions. One team explores them together.' },
    { nodes: ['Economics', 'Scenario analysis', 'Market research', 'Strategy', 'Commercial', 'Delivery'], rationale: 'Research and operating experience help turn possible directions into options that can be examined, challenged and tested.' },
  ];
  select.addEventListener('change', () => {
    const team = teams[select.selectedIndex];
    document.querySelectorAll('.team-node span').forEach((node, i) => node.textContent = team.nodes[i]);
    document.querySelector('[data-team-name]').textContent = select.value;
    document.querySelector('[data-team-rationale]').textContent = team.rationale;
  });
}
