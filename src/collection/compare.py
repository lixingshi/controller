import cv2
import numpy as np
import crop
import os
import math
import sys

if len(sys.argv) < 3:
    raise Exception("params ara missing")

path_wait_check = sys.argv[1]
path_compared = sys.argv[2]

if os.path.exists(path_wait_check) and os.path.exists(path_compared):
    img_wait_check = cv2.imread(path_wait_check)
    img_compared = cv2.imread(path_compared)

    surf = cv2.xfeatures2d.SURF_create()
    (kps1, descs1) = surf.detectAndCompute(img_wait_check, None)
    (kps2, descs2) = surf.detectAndCompute(img_compared, None)

    bf = cv2.BFMatcher()
    matches = bf.knnMatch(descs1, descs2, k=2)

    good = []
    for m, n in matches:
        if m.distance < 0.48 * n.distance:
            good.append([m])

    if len(good) > 0:
        if math.fabs(len(kps2) - len(kps2)) <= 0.7*min(len(kps1), len(kps2)):
            print 1
        else:
            print 0
    else:
        print 0

else:
    raise Exception("image path not exist")


