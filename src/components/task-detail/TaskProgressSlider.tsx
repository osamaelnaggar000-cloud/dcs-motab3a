import React from 'react';

interface TaskProgressSliderProps {
    progress: number;
    setProgress: (value: number) => void;
    isParentTask: boolean;
}

const TaskProgressSlider: React.FC<TaskProgressSliderProps> = ({
    progress,
    setProgress,
    isParentTask,
}) => {
    return (
        <div className="space-y-2 pt-4">
            <label htmlFor="progress-slider" className={`block text-sm font-medium ${isParentTask ? 'text-slate-400' : 'text-zinc-700'}`}>
                نسبة الإنجاز: <span className="font-bold text-emerald-600">{progress}%</span>
            </label>
            <div className="flex items-center gap-4">
                <input
                    id="progress-slider"
                    type="range"
                    min="0"
                    max="100"
                    value={progress}
                    onChange={(e) => setProgress(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600 disabled:opacity-50"
                    disabled={isParentTask}
                />
                <input
                    type="number"
                    min="0"
                    max="100"
                    value={progress}
                    onChange={(e) => {
                        const val = Math.max(0, Math.min(100, Number(e.target.value)));
                        setProgress(val);
                    }}
                    className="w-20 p-2 border border-slate-300 rounded-md text-center focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-slate-100 disabled:text-slate-500"
                    aria-label="نسبة الإنجاز"
                    disabled={isParentTask}
                />
            </div>
            {isParentTask && <p className="text-xs text-slate-500 text-center">يتم حساب نسبة إنجاز المهمة الرئيسية تلقائياً من مهامها الفرعية.</p>}
        </div>
    );
};

export default TaskProgressSlider;
