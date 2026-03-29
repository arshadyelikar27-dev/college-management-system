const fs = require("fs");
const path = require("path");

const dataDir = path.join(__dirname, "../../data");

const getFilePath = (collection) => path.join(dataDir, `${collection}.json`);

const read = (collection) => {
  try {
    const filePath = getFilePath(collection);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, "[]", "utf8");
      return [];
    }
    const data = fs.readFileSync(filePath, "utf8");
    return JSON.parse(data || "[]");
  } catch (error) {
    console.error(`Error reading ${collection}:`, error);
    return [];
  }
};

const write = (collection, data) => {
  try {
    const filePath = getFilePath(collection);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
    return true;
  } catch (error) {
    console.error(`Error writing ${collection}:`, error);
    return false;
  }
};

const findOne = (collection, predicate) => {
  const items = read(collection);
  return items.find(predicate);
};

const find = (collection, predicate) => {
  const items = read(collection);
  return predicate ? items.filter(predicate) : items;
};

const create = (collection, item) => {
  const items = read(collection);
  items.push(item);
  write(collection, items);
  return item;
};

const update = (collection, id, updates) => {
  const items = read(collection);
  const index = items.findIndex((i) => i.id === id);
  if (index !== -1) {
    items[index] = { ...items[index], ...updates };
    write(collection, items);
    return items[index];
  }
  return null;
};

const remove = (collection, id) => {
  let items = read(collection);
  const initialLength = items.length;
  items = items.filter((i) => i.id !== id);
  if (items.length !== initialLength) {
    write(collection, items);
    return true;
  }
  return false;
};

module.exports = {
  read,
  write,
  findOne,
  find,
  create,
  update,
  remove,
};
