import cv2
from glob import glob
import os
import sys
import traceback

def checkColor(r, g, b):
    if 125 <= r and r <= 255 and 0 <= g and g <= 45 and 0 <= b and b <= 60:
        return True
    else:
        return False

def checkPointStart(point, img):
    h,w ,c = img.shape
    state = True
    if point[1] + 25 > w or point[0] + 25 > h:
        return False

    for x in range(point[1], point[1]+25):
        b, g, r = img[point[0], x]
        if not checkColor(r, g, b):
            state = False

    for y in range(point[0], point[0]+25):
        b, g, r = img[y,point[1]]
        if not checkColor(r, g, b):
            state = False

    return state

def checkPointStop(point, img):
    state = True
    if point[1] - 25 < 0 or point[0] - 25 < 0:
        return False

    for x in range(point[1]-25, point[1]):
        b, g, r = img[point[0], x]
        if not checkColor(r, g, b):
            state = False

    for y in range(point[0]-25, point[0]):
        b, g, r = img[y,point[1]]
        if not checkColor(r, g, b):
            state = False

    return state


def cropRectImge(img):
    start = (0, 0)
    stop = (0, 0)
    is_start = True
    is_stop = False

    for i, cells in enumerate(img):
        if is_stop:
            break
        for j, cell in enumerate(cells):
            b, g, r = cell
            if checkColor(r, g, b):
                if is_start:
                    if checkPointStart((i, j),img):
                        start = (i, j)
                        stop = (i, j)
                        is_start = False
                else:
                    if i - stop[0] == 1 or i - stop[0] == 0:
                        stop = (i, j)
                    elif checkPointStart((i, j),img):
                        start = (i, j)
                        stop = (i, j)
            elif stop[0] == i and j-stop[1] == 1 and checkPointStop((i, j-1), img):
                is_stop = True
                break

    print str(start[1]),str(start[0])+';'+str(stop[1]),str(stop[0])

    w = stop[1] - start[1]
    h = stop[0] - start[0]

    img = img[start[0]+5:h + start[0]-5, start[1]+5:w + start[1]-5]
    return img

# for fn in glob('./data/*.jpg'):
#     fname = os.path.basename(fn)
#     print fname
#     img = cv2.imread(fn)
#     img = cropRectImge(img)
#     img = cv2.cvtColor(img,cv2.COLOR_BGR2GRAY)
#     cv2.imwrite(fname,img)


# cv2.imshow("Image", cropRectImge(img2))
# cv2.waitKey(0)
# cv2.destroyAllWindows()


if os.path.basename(sys.argv[0]) == "crop.py":
    if len(sys.argv) < 3:
        raise Exception("Parameters are missing")

    path_origin = sys.argv[1]
    path_dest = sys.argv[2]

    if os.path.exists(path_origin):
        img = cv2.imread(path_origin)
        img = cropRectImge(img)
        img = cv2.cvtColor(img,cv2.COLOR_BGR2GRAY)
        cv2.imwrite(path_dest,img)
