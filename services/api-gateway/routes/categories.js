const express = require('express');
const Category = require('../models/Category');
const asyncHandler = require('../middleware/asyncHandler');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { authenticateJWT } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();

// Public: Get all active categories
router.get(
  '/',
  asyncHandler(async (req, res) => {
    let categories = await Category.find({ isActive: true }).sort({ displayOrder: 1 });
    if (categories.length === 0) {
      const defaultCategories = [
        { name: 'Everyday Carry', slug: 'electronics', tag: '01 / EVERYDAY CARRY', description: 'Pocket tools, analog audio, and vintage cameras calibrated for daily utility.', icon: 'Camera', displayOrder: 1 },
        { name: 'Home Archive', slug: 'furniture', tag: '02 / HOME ARCHIVE', description: 'Restored mid-century teak, sculptural seating, and archival interior objects.', icon: 'Armchair', displayOrder: 2 },
        { name: 'Creative Tools', slug: 'studio', tag: '03 / CREATIVE TOOLS', description: 'Drafting instruments, optical viewfinders, and precision analog sound equipment.', icon: 'Radio', displayOrder: 3 },
        { name: 'Archival Wear', slug: 'fashion', tag: '04 / ARCHIVAL WEAR', description: 'Timeless outerwear, heavy canvas bags, and heritage leather footwear.', icon: 'Shirt', displayOrder: 4 },
        { name: 'Paper Archive', slug: 'books', tag: '05 / PAPER ARCHIVE', description: 'First-edition monographs, design annuals, and architectural catalogs.', icon: 'BookOpen', displayOrder: 5 }
      ];
      categories = await Category.insertMany(defaultCategories);
    }
    return successResponse(res, { categories });
  })
);

// Admin: Create category
router.post(
  '/',
  authenticateJWT,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const { name, slug, tag, description, icon, image, displayOrder } = req.body;
    if (!name || !slug) {
      return errorResponse(res, 'name and slug are required', 400);
    }

    try {
      const category = await Category.create({
        name: name.trim(),
        slug: slug.toLowerCase().trim(),
        tag: tag || 'CURATED ARCHIVE',
        description,
        icon,
        image,
        displayOrder: displayOrder ? Number(displayOrder) : 0,
        isActive: true
      });
      return successResponse(res, { category }, 201);
    } catch (error) {
      if (error.code === 11000) {
        return errorResponse(res, 'Category name or slug already exists', 409);
      }
      throw error;
    }
  })
);

// Admin: Update category
router.put(
  '/:id',
  authenticateJWT,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!category) return errorResponse(res, 'Category not found', 404);
    return successResponse(res, { category });
  })
);

// Admin: Delete category
router.delete(
  '/:id',
  authenticateJWT,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const deleted = await Category.findByIdAndDelete(req.params.id);
    if (!deleted) return errorResponse(res, 'Category not found', 404);
    return successResponse(res, {}, 200, 'Category deleted');
  })
);

module.exports = router;
