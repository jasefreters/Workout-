# Garage Gym

A simple workout tracker for the home gym (cable functional trainer with two weight stacks, adjustable bench, pull-up bar, dip bars, Smith bar). There are no plates, so all the loaded exercises are on the cables.

- **4 training days:** Chest & Triceps, Back & Biceps, Shoulders/Legs/Glutes, Full Body + Abs
- Each day lists 12–13 exercises. The first 5 are ticked by default, and you choose what to do today.
- Log weight and reps for each set. It shows what you lifted last time and your best, and tells you when to go up a weight.
- A **rest timer** starts when you tick a set done (1 minute by default; choose Off, 1:00, 1:30, 2:00 or 3:00). The phone vibrates and beeps when it's time for the next set, and the screen stays on during a workout.
- **Next up**: the home screen highlights the day after the one you did last, so the four days rotate whenever you train.
- **Muscle maps** show which muscles each day and exercise work.
- **Warm-up sets**: tap a set's number to mark it as a warm-up. Warm-ups are saved but don't count towards records, charts or suggestions.
- **Records**: a 🏆 and a pop-up when you beat your best, and each exercise shows an estimated one-rep max with its own chart.
- **Stack-aware suggestions**: set your heaviest cable stack setting on the home screen. Once you max it out, the app suggests a harder variation instead of more weight.
- The **Progress** tab has a year-long activity map, your workout streak, a bodyweight log with a goal line, and a chart for each exercise.
- **History** lists every workout. Edit any saved workout, or log one you forgot to record.
- Tap the **(i)** next to any exercise for an animated illustration, muscles worked, step-by-step instructions and tips.
- **Add your own exercise** to any day from the bottom of that day's list. Your own exercises can be edited or deleted from their (i) sheet.
- Supports more than one person (use the name picker in the top right).

Data is saved in the browser on your device. Use **Export backup** on the home screen to keep a copy or move it to another phone.

## Using it

Open `index.html` in a browser. To use it on your phone, turn on GitHub Pages (Settings → Pages → deploy from branch) and add the page to your home screen.

Built-in exercises live in `exercises.js`, the how-to text in `guide.js`, and the stick-figure illustrations in `illustrations.js`.

## Credits

The muscle map outlines (`bodymap-data.js`) come from [MuscleMap](https://github.com/melihcolpan/MuscleMap) by Melih Colpan, used under the MIT License (included in that file), as converted to JSON by [openGym](https://github.com/DuarteSantos8/openGym).
