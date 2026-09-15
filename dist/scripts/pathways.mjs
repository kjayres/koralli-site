export const projects = {
  governance: {
    name: 'AI governance',
    intro: 'Understand where AI is used, test how it behaves and put clear ownership around it.',
    stages: [
      ['See the decisions. Find the uncertainty.', 'Map where AI is used, who relies on it and what happens when it is wrong. Work with the people responsible for the decisions, systems and controls.', 'A shared map of use cases, responsibilities and questions to test.'],
      ['Make the controls tangible.', 'Develop and test a focused set of evaluations, review points and escalation routes around a chosen use case. Demonstrate the work with the people who will operate it.', 'A tested approach to evaluation, oversight and escalation.'],
      ['Keep learning as the system changes.', 'Use the evidence from real use to revisit controls and responsibilities. Help the team recognise changes in behaviour and decide when further review is needed.', 'An owned review rhythm, with the tools and knowledge to maintain it.'],
    ],
  },
  data: {
    name: 'Data foundations',
    intro: 'Connect the decisions you need to make with data you can understand and use.',
    stages: [
      ['Start with the decision.', 'Follow how information reaches the people doing the work. Establish what is available, where definitions differ and which gaps matter for the decision.', 'A shared understanding of the data, its limitations and the first useful question.'],
      ['Build a useful first view.', 'Bring a focused set of sources together and test the definitions with the team. Make the resulting measure or view visible early, so it can be challenged and improved.', 'A working data foundation and a practical view of the chosen question.'],
      ['Make it part of the work.', 'Agree who maintains the data and how it is reviewed. Use feedback from the people relying on it to improve coverage, quality and interpretation.', 'Clear ownership, documented definitions and a route to the next useful question.'],
    ],
  },
  workflow: {
    name: 'Workflow redesign',
    intro: 'Follow the work from end to end, then test a better way of doing it.',
    stages: [
      ['Follow the work.', 'Observe the handoffs, decisions and exceptions in a real workflow. Explore where people spend time, where work waits and what a better outcome would mean.', 'An agreed view of the workflow and a focused opportunity to test.'],
      ['Try the change in practice.', 'Prototype a revised workflow with the people using it. Test where technology helps, where human judgement is essential and how exceptions should be handled.', 'A working pilot, with evidence about its usefulness and its limits.'],
      ['Help the change take hold.', 'Refine the workflow through demonstrations and feedback. Establish responsibilities, useful measures and the capability to continue improving it.', 'A workable operating rhythm, with the client team able to develop it further.'],
    ],
  },
};

export function initPathways() {
  const root = document.querySelector('.pathways');
  if (!root) return;
  const projectButtons = [...root.querySelectorAll('[data-project]')];
  const stones = [...root.querySelectorAll('[data-stage]')];
  const detail = root.querySelector('#stage-detail');
  const phaseNames = ['Go and See', 'Build', 'Adapt & Grow'];
  let projectKey = 'governance';
  let stage = 0;

  function render() {
    const project = projects[projectKey];
    const [title, body, output] = project.stages[stage];
    root.querySelector('[data-project-intro]').textContent = project.intro;
    root.querySelector('[data-stage-label]').textContent = `${project.name} / 0${stage + 1} · ${phaseNames[stage]}`;
    root.querySelector('[data-stage-title]').textContent = title;
    root.querySelector('[data-stage-body]').textContent = body;
    root.querySelector('[data-stage-output]').textContent = output;
    projectButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.project === projectKey)));
    stones.forEach((button, i) => {
      button.setAttribute('aria-selected', String(i === stage));
      button.tabIndex = i === stage ? 0 : -1;
      button.querySelector('.stone-cue').textContent = i === stage ? 'READING −' : 'EXPLORE +';
    });
    detail.setAttribute('aria-labelledby', `stone-tab-${stage}`);
  }

  projectButtons.forEach(button => button.addEventListener('click', () => {
    projectKey = button.dataset.project;
    stage = 0;
    render();
  }));
  stones.forEach((button, i) => {
    button.addEventListener('click', () => {
      stage = i;
      render();
      if (window.innerWidth < 760) {
        detail.focus({ preventScroll: true });
        detail.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
      }
    });
    button.addEventListener('keydown', event => {
      const direction = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
      if (direction === undefined && !['Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      stage = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (i + direction + 3) % 3;
      render();
      stones[stage].focus();
    });
  });
}

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
