import {
  IProcess,
  Algorithm
} from "@/store/processor-scheduling/models.interface";
import store from "@/store/processor-scheduling/index";

const isEveryProcessFinished = () => {
  return store.state.processes.every(process => {
    return process.timeLeft === 0;
  });
};

export const animatedFcfs = (i = 0, skipNextTimeout = false) => {
  if (isEveryProcessFinished()) {
    store.commit("changeAnimationState", { change: false });
    return;
  }

  if (store.state.isAnimationRunning) {
    setTimeout(
      () => {
        const { length } = store.state.processes;

        const currentProcess = store.state.processes[i % length];

        if (currentProcess.timeLeft >= 1) {
          store.state.processes[i % length].timeLeft += -1;

          let nextIndex = i;
          if (currentProcess.timeLeft === 0) {
            nextIndex++;
          }
          requestAnimationFrame(() => animatedFcfs(nextIndex % length));
        } else {
          requestAnimationFrame(() => animatedFcfs(i + 1, true));
        }
      },
      skipNextTimeout ? 0 : 1000 * (1 / store.state.animationSpeed)
    );
  }
};

const getShortestProcess = () => {
  const sortedUnfinished = [...store.state.processes]
    .sort((a, b) => {
      return a.timeLeft - b.timeLeft;
    })
    .filter(process => {
      return process.timeLeft !== 0;
    });
  return sortedUnfinished[0] || null;
};

const getIndexOfShortest = () => {
  return store.state.processes.indexOf(getShortestProcess());
};

export const animatedSjf = (
  i = getIndexOfShortest(),
  skipNextTimeout = false
) => {
  if (store.state.isAnimationRunning) {
    setTimeout(
      () => {
        const { length } = store.state.processes;

        // don't stop until finished
        const currentProcess = store.state.processes[i % length];

        if (currentProcess === null || currentProcess === undefined) {
          store.commit("changeAnimationState", { change: false });
          return;
        }

        if (currentProcess.timeLeft >= 1) {
          currentProcess.timeLeft += -1;

          let nextIndex = i;
          if (currentProcess.timeLeft === 0) {
            nextIndex = store.state.processes.indexOf(getShortestProcess());
          }
          requestAnimationFrame(() => animatedSjf(nextIndex % length));
        } else {
          requestAnimationFrame(() => animatedSjf(i + 1, true));
        }
      },
      skipNextTimeout ? 0 : 1000 * (1 / store.state.animationSpeed)
    );
  }
};

export const animatedPsjf = (
  i = getIndexOfShortest(),
  skipNextTimeout = false
) => {
  if (store.state.isAnimationRunning) {
    setTimeout(
      () => {
        const { length } = store.state.processes;

        const currentProcess = getShortestProcess();

        if (currentProcess === null) {
          store.commit("changeAnimationState", { change: false });
          return;
        }

        if (currentProcess.timeLeft >= 1) {
          currentProcess.timeLeft += -1;

          let nextIndex = i;
          if (currentProcess.timeLeft === 0) {
            nextIndex++;
          }
          requestAnimationFrame(() => animatedPsjf(nextIndex % length));
        } else {
          requestAnimationFrame(() => animatedPsjf(i + 1, true));
        }
      },
      skipNextTimeout ? 0 : 1000 * (1 / store.state.animationSpeed)
    );
  }
};

let currentProcessStepCounter = 0;

export const animatedRot = (i = 0, skipNextTimeout = false) => {
  if (isEveryProcessFinished()) {
    store.commit("changeAnimationState", { change: false });
    return;
  }

  if (store.state.isAnimationRunning) {
    setTimeout(
      () => {
        const { length } = store.state.processes;

        const currentProcess = store.state.processes[i % length];

        if (currentProcess.timeLeft >= 1) {
          store.state.processes[i % length].timeLeft += -1;
          currentProcessStepCounter++;
          if (
            currentProcessStepCounter % store.state.timeQuantum === 0 &&
            currentProcessStepCounter > 0
          ) {
            currentProcessStepCounter = 0;
            requestAnimationFrame(() => animatedRot(i + 1));
          } else {
            requestAnimationFrame(() => animatedRot(i));
          }
        } else {
          currentProcessStepCounter = 0;
          requestAnimationFrame(() => animatedRot(i + 1, true));
        }
      },
      skipNextTimeout ? 0 : 1000 * (1 / store.state.animationSpeed)
    );
  }
};

const roundTwoDecimals = (x: number) => {
  return Math.round(x * 100) / 100;
};

export const averageWaitingTimeFcfs = () => {
  const { processes } = store.state;
  let accelerator = 0;

  for (let i = 0; i < store.state.processes.length - 1; i++) {
    accelerator += accelerator + store.state.processes[i].neededTime;
  }

  const avg = accelerator / store.state.processes.length;
  return roundTwoDecimals(avg);
};

export const averageWaitingTimeSjf = () => {
  const { processes } = store.state;

  const sortedProcesses = [...processes].sort((a, b) => {
    return a.neededTime - b.neededTime;
  });
  let accelerator = 0;

  for (let i = 0; i < sortedProcesses.length - 1; i++) {
    accelerator += accelerator + sortedProcesses[i].neededTime;
  }

  const avg = accelerator / sortedProcesses.length;
  return roundTwoDecimals(avg);
};

export const averageWaitingTimePsjf = () => {
  return averageWaitingTimeSjf();
};

export const averageWaitingTimeRot = () => {
  const { initialProcesses, timeQuantum } = store.state;
  const clonedProcesses = [...initialProcesses].map(process => ({
    ...process
  }));

  let time = 0;

  const waitingTimes = clonedProcesses.map(() => {
    return 0;
  });

  let isDone = false;

  while (!isDone) {
    isDone = true;
    for (let i = 0; i < clonedProcesses.length; i++) {
      const process = clonedProcesses[i];

      // process further
      if (process.timeLeft > 0) {
        isDone = false;

        if (process.timeLeft > timeQuantum) {
          time += timeQuantum;
          process.timeLeft -= timeQuantum;
        } else {
          // last cycle for the process

          // add needed processing time to the time
          time += process.timeLeft;

          waitingTimes[i] = time - process.neededTime;

          process.timeLeft = 0;
        }
      }

      if (isDone) {
        break;
      }
    }
  }

  let totalWaitingTime = 0;
  for (let i = 0; i < waitingTimes.length; i++) {
    totalWaitingTime += waitingTimes[i];
  }

  const avg = totalWaitingTime / waitingTimes.length;
  return roundTwoDecimals(avg);
};

export const executeSelectedAlgorithm = () => {
  switch (+(store.state.selectedAlgorithm as Algorithm)) {
    case Algorithm.fcfs: {
      animatedFcfs();
      break;
    }
    case Algorithm.sjf: {
      animatedSjf();
      break;
    }
    case Algorithm.psjf: {
      animatedPsjf();
      break;
    }
    case Algorithm.rot: {
      animatedRot();
      break;
    }
    default: {
      break;
    }
  }
};

export const getAvgWaitingTime = () => {
  switch (+(store.state.selectedAlgorithm as Algorithm)) {
    case Algorithm.fcfs: {
      return averageWaitingTimeFcfs();
    }
    case Algorithm.sjf: {
      return averageWaitingTimeSjf();
    }
    case Algorithm.psjf: {
      return averageWaitingTimePsjf();
    }
    case Algorithm.rot: {
      return averageWaitingTimeRot();
    }
    default: {
      return "?";
    }
  }
};
