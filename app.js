const express = require('express');
const app = express();
const mongoose = require("mongoose");
const bodyParser = require("body-parser");

// Connect to MongoDB
mongoose.connect("mongodb://localhost:27017/ToDOList");

// Define schema and model
const taskSchema = new mongoose.Schema({
    id : String,
    task : String,
    status : String
});

const tasksContainerSchema = new mongoose.Schema({
    tasks: [taskSchema]
});

const TasksContainer = mongoose.model("TasksContainer", tasksContainerSchema);

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// Initialize the single document if it doesn't exist
const initializeTasksContainer = async () => {
    const existingContainer = await TasksContainer.findOne();
    if (!existingContainer) {
        const newContainer = new TasksContainer({ tasks: [] });
        await newContainer.save();
    }
};

initializeTasksContainer();

// Routes
// to fetch all tasks
app.get("/getTasks", async (req, res) => {
    try {
        const container = await TasksContainer.findOne();
        res.status(200).json(container.tasks);
    } catch (err) {
        res.status(500).json({ error: "There was an error fetching the tasks: " + err.message });
    }
});

// to fetch all tasks with pagination
app.get("/getTasks/paginated", async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;  // Default to page 1 and limit 10
        const container = await TasksContainer.findOne();

        // Calculate the starting index and limit
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;

        // Get the subset of tasks for the current page
        const paginatedTasks = container.tasks.slice(startIndex, endIndex);

        // Return paginated results with metadata
        res.status(200).json({
            tasks: paginatedTasks,
            currentPage: page,
            totalPages: Math.ceil(container.tasks.length / limit),
            totalTasks: container.tasks.length
        });
    } catch (err) {
        res.status(500).json({ error: "There was an error fetching the tasks: " + err.message });
    }
});

// GET route to fetch tasks based on status
// fetch tasks by their status
app.get("/getTasks/bystatus", async (req, res) => {
    try {
        const { page = 1, limit = 10, status } = req.query;  // Default to page 1 and limit 10

        // Construct regex pattern for case-insensitive search
        const regexPattern = new RegExp(status, "i");

        // Query to fetch tasks based on status
        const query = status ? { "tasks.status": { $regex: regexPattern } } : {};

        // Fetch container containing all tasks
        const container = await TasksContainer.findOne(query);

        // If container not found or no tasks found, return empty array
        if (!container || !container.tasks) {
            return res.status(200).json({
                tasks: [],
                currentPage: page,
                totalPages: 0,
                totalTasks: 0
            });
        }

        // Calculate the starting index and limit
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;

        // Get the subset of tasks for the current page
        let paginatedTasks = container.tasks;

        // Filter tasks based on status using regex
        if (status) {
            paginatedTasks = paginatedTasks.filter(task => regexPattern.test(task.status));
        }

        // Paginate the filtered tasks
        paginatedTasks = paginatedTasks.slice(startIndex, endIndex);

        // Return paginated results with metadata
        res.status(200).json({
            tasks: paginatedTasks,
            currentPage: page,
            totalPages: Math.ceil(paginatedTasks.length / limit),
            totalTasks: paginatedTasks.length
        });
    } catch (err) {
        res.status(500).json({ error: "There was an error fetching the tasks: " + err.message });
    }
});

// Route to update a specific task
app.put("/updatetask", async (req, res) => {
    try {
        const { id } = req.query; // Task ID to update
        const { task, status } = req.body; // Updated task details

        const container = await TasksContainer.findOne();
        const taskIndex = container.tasks.findIndex(task => task.id.toString() === id);

        if (taskIndex !== -1) {
            container.tasks[taskIndex].task = task || container.tasks[taskIndex].task;
            container.tasks[taskIndex].status = status || container.tasks[taskIndex].status;

            await container.save();
            res.status(200).json({ message: "Task updated successfully" });
        } else {
            res.status(404).json({ error: "Task not found" });
        }
    } catch (err) {
        res.status(500).json({ error: "There was an error updating the task: " + err.message });
    }
});

// ti insert a task 
app.post("/addTask", async (req, res) => {
    try {
        const newTask = {
            id : req.body.id,
            task : req.body.task,
            status : req.body.status
        };

        const container = await TasksContainer.findOne();
        container.tasks.push(newTask);
        await container.save();
        res.status(200).json({ message: "Task added successfully" });
    } catch (err) {
        res.status(500).json({ error: "There was an error adding the task: " + err.message });
    }
});

// DELETE route to delete a task by ID
app.delete("/deletebyid", async (req, res) => {
    try {
        const { id } = req.query; // Task ID to delete

        // Find the container containing all tasks
        const container = await TasksContainer.findOne();

        // Find the index of the task with the given ID
        const taskIndex = container.tasks.findIndex(task => task.id.toString() === id);

        // If the task is found, remove it from the tasks array
        if (taskIndex !== -1) {
            container.tasks.splice(taskIndex, 1);
            await container.save();
            res.status(200).json({ message: "Task deleted successfully" });
        } else {
            // If the task with the given ID is not found, return a 404 Not Found response
            res.status(404).json({ error: "Task not found" });
        }
    } catch (err) {
        // If there's an error, return a 500 Internal Server Error response
        res.status(500).json({ error: "There was an error deleting the task: " + err.message });
    }
});


// Start the server
app.listen(3000, () => {
    console.log("App is running on Port 3000");
});
